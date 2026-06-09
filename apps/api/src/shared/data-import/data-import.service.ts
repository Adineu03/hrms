import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type {
  ImportUploadResult,
  ColumnMappingData,
  ImportValidationResult,
  ImportExecuteResult,
  DataImportInfo,
  ImportValidationError,
} from '@hrms/shared';
import { EMPLOYEE_IMPORT_FIELDS } from '@hrms/shared';
import { AiCoreService } from '../ai/ai-core.service';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import * as schema from '../../infrastructure/database/schema';
import { dataImports } from '../../infrastructure/database/schema/data-imports';
import { users } from '../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../infrastructure/database/schema/employee-profiles';
import { departments } from '../../infrastructure/database/schema/departments';
import { designations } from '../../infrastructure/database/schema/designations';
import { ExcelParser } from './parsers/excel-parser';
import { EmployeeValidator } from './validators/employee-validator';

@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly ai: AiCoreService,
  ) {}

  async uploadFile(
    orgId: string,
    userId: string,
    buffer: Buffer,
    fileName: string,
    type: string,
  ): Promise<ImportUploadResult> {
    // 1. Parse file
    const { headers, rows } = ExcelParser.parse(buffer);

    // 2. Auto-suggest column mapping by matching header names
    const suggestedMapping: ColumnMappingData = {};
    const fieldDefs = EMPLOYEE_IMPORT_FIELDS;
    for (const fieldDef of fieldDefs) {
      const match = headers.find(
        (h) =>
          h.toLowerCase().replace(/[_\s-]/g, '') ===
            fieldDef.label.toLowerCase().replace(/[_\s-]/g, '') ||
          h.toLowerCase().replace(/[_\s-]/g, '') ===
            fieldDef.field.toLowerCase(),
      );
      if (match) suggestedMapping[fieldDef.field] = match;
    }

    // 3. Create import record
    const now = new Date();
    const [record] = await this.db
      .insert(dataImports)
      .values({
        orgId,
        type,
        fileName,
        status: 'parsing',
        totalRows: rows.length,
        rawData: rows,
        columnMapping: suggestedMapping,
        importedBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      importId: record.id,
      fileName,
      headers,
      rowCount: rows.length,
      suggestedMapping,
    };
  }

  async mapColumns(
    orgId: string,
    importId: string,
    mapping: ColumnMappingData,
  ): Promise<void> {
    const [record] = await this.db
      .select()
      .from(dataImports)
      .where(and(eq(dataImports.id, importId), eq(dataImports.orgId, orgId)))
      .limit(1);
    if (!record) throw new NotFoundException('Import not found');

    await this.db
      .update(dataImports)
      .set({
        columnMapping: mapping,
        status: 'validating',
        updatedAt: new Date(),
      })
      .where(eq(dataImports.id, importId));
  }

  /**
   * AI Column Mapper — propose a mapping from the uploaded file's (possibly
   * messy) column headers to the known employee import fields, using the
   * headers + a few sample rows. Returns a suggestion only; the user reviews
   * and confirms it in the wizard before validation.
   */
  async suggestMapping(
    orgId: string,
    importId: string,
  ): Promise<
    | { ok: true; mapping: ColumnMappingData; details: { field: string; header: string; confidence: string }[]; mappedCount: number; totalFields: number }
    | { ok: false; message: string }
  > {
    if (!this.ai.isReady()) {
      return { ok: false, message: 'AI column mapping is not configured on this server.' };
    }

    const [record] = await this.db
      .select()
      .from(dataImports)
      .where(and(eq(dataImports.id, importId), eq(dataImports.orgId, orgId)))
      .limit(1);
    if (!record) throw new NotFoundException('Import not found');

    const rows = (record.rawData as Record<string, unknown>[]) || [];
    if (rows.length === 0) return { ok: false, message: 'No data rows to analyze.' };

    const headers = Object.keys(rows[0] ?? {});
    if (headers.length === 0) return { ok: false, message: 'No columns found in the file.' };
    const headerSet = new Set(headers);
    const sampleRows = rows.slice(0, 4);

    const fieldNames = EMPLOYEE_IMPORT_FIELDS.map((f) => f.field);
    const MappingSchema = z.object({
      mappings: z.array(
        z.object({
          field: z.enum(fieldNames as unknown as [string, ...string[]]),
          header: z.string(),
          confidence: z.enum(['high', 'medium', 'low']),
        }),
      ),
    });

    const instructions = `You map a spreadsheet's column headers to a fixed set of employee fields for a bulk import.

You are given the target fields (with their human labels) and the source file's actual column headers plus a few sample rows.
For each target field that has a good match, output { field, header, confidence }.

Rules:
- "header" MUST be copied EXACTLY from the provided source headers list. Never invent a header.
- Match by MEANING, not just exact text. Examples: "Mail ID"/"E-mail" → email; "Cell"/"Mobile"/"Contact No" → phone; "Joining Dt"/"DOJ" → dateOfJoining; "Dept" → department; "Designation"/"Title"/"Role" → designation; "DOB" → dateOfBirth; "Manager Email"/"Reports To" → managerId.
- Use the sample values to disambiguate (e.g. a column of emails → email; dd/mm/yyyy values → a date field).
- Only include a field when you are reasonably confident; omit fields with no good source column.
- Do not map two different target fields to the same source header unless that column truly contains both.`;

    try {
      const result = await this.ai.extractStructured<z.infer<typeof MappingSchema>>({
        name: 'ColumnMapper',
        schema: MappingSchema,
        instructions,
        text: JSON.stringify({
          targetFields: EMPLOYEE_IMPORT_FIELDS,
          sourceHeaders: headers,
          sampleRows,
        }),
      });

      const mapping: ColumnMappingData = {};
      const details: { field: string; header: string; confidence: string }[] = [];
      const usedHeaders = new Set<string>();
      for (const m of result.mappings || []) {
        if (m.header && headerSet.has(m.header) && !mapping[m.field] && !usedHeaders.has(m.header)) {
          mapping[m.field] = m.header;
          usedHeaders.add(m.header);
          details.push({ field: m.field, header: m.header, confidence: m.confidence });
        }
      }

      return {
        ok: true,
        mapping,
        details,
        mappedCount: Object.keys(mapping).length,
        totalFields: EMPLOYEE_IMPORT_FIELDS.length,
      };
    } catch (err: any) {
      this.logger.error('AI column mapping failed', err?.message || err);
      return { ok: false, message: 'Could not generate a mapping. Please map the columns manually.' };
    }
  }

  async validate(
    orgId: string,
    importId: string,
  ): Promise<ImportValidationResult> {
    const [record] = await this.db
      .select()
      .from(dataImports)
      .where(and(eq(dataImports.id, importId), eq(dataImports.orgId, orgId)))
      .limit(1);
    if (!record) throw new NotFoundException('Import not found');

    const rows = record.rawData as Record<string, unknown>[];
    const mapping = record.columnMapping as Record<string, string>;

    // Get existing emails
    const existingUsers = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.orgId, orgId));
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    const { validRows, errors } = EmployeeValidator.validate(
      rows,
      mapping,
      existingEmails,
    );

    const preview = validRows.slice(0, 10);

    await this.db
      .update(dataImports)
      .set({
        status: 'preview',
        validRows: validRows.length,
        errorRows: rows.length - validRows.length,
        validationErrors: errors,
        previewData: preview,
        updatedAt: new Date(),
      })
      .where(eq(dataImports.id, importId));

    return {
      totalRows: rows.length,
      validRows: validRows.length,
      errorRows: rows.length - validRows.length,
      errors,
      preview,
    };
  }

  async execute(
    orgId: string,
    importId: string,
  ): Promise<ImportExecuteResult> {
    const [record] = await this.db
      .select()
      .from(dataImports)
      .where(and(eq(dataImports.id, importId), eq(dataImports.orgId, orgId)))
      .limit(1);
    if (!record) throw new NotFoundException('Import not found');
    if (record.status !== 'preview')
      throw new BadRequestException('Import must be validated first');

    const rows = record.rawData as Record<string, unknown>[];
    const mapping = record.columnMapping as Record<string, string>;

    // Re-validate to get valid rows
    const existingUsers = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.orgId, orgId));
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
    const { validRows } = EmployeeValidator.validate(rows, mapping, existingEmails);

    await this.db
      .update(dataImports)
      .set({ status: 'importing', updatedAt: new Date() })
      .where(eq(dataImports.id, importId));

    // Lookup department/designation names -> IDs
    const orgDepts = await this.db
      .select()
      .from(departments)
      .where(eq(departments.orgId, orgId));
    const orgDesigs = await this.db
      .select()
      .from(designations)
      .where(eq(designations.orgId, orgId));
    const deptMap = new Map(orgDepts.map((d) => [d.name.toLowerCase(), d.id]));
    const desigMap = new Map(orgDesigs.map((d) => [d.name.toLowerCase(), d.id]));

    let importedCount = 0;
    const importErrors: ImportValidationError[] = [];
    const now = new Date();
    const tempPassword = await bcrypt.hash(randomUUID(), 10);

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const email = String(row['email']).trim().toLowerCase();
        const firstName = String(row['firstName'] || '').trim();
        const lastName = String(row['lastName'] || '').trim();

        // Create user
        const [user] = await this.db
          .insert(users)
          .values({
            orgId,
            email,
            passwordHash: tempPassword,
            role: 'employee',
            firstName: firstName || 'Employee',
            lastName: lastName || null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        // Create profile
        const deptName = String(row['department'] || '').trim().toLowerCase();
        const desigName = String(row['designation'] || '').trim().toLowerCase();

        await this.db.insert(employeeProfiles).values({
          orgId,
          userId: user.id,
          departmentId: deptMap.get(deptName) ?? null,
          designationId: desigMap.get(desigName) ?? null,
          phone: String(row['phone'] || '') || null,
          gender: String(row['gender'] || '') || null,
          dateOfJoining: row['dateOfJoining'] ? String(row['dateOfJoining']) : null,
          employmentType: String(row['employmentType'] || 'full_time'),
          onboardingStatus: 'pending',
          createdAt: now,
          updatedAt: now,
        });

        importedCount++;
      } catch (e: any) {
        importErrors.push({
          row: i + 2,
          column: 'general',
          error: e.message,
          severity: 'error',
        });
      }
    }

    await this.db
      .update(dataImports)
      .set({
        status: 'completed',
        importedRows: importedCount,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(dataImports.id, importId));

    return {
      importedRows: importedCount,
      skippedRows: validRows.length - importedCount,
      errors: importErrors,
    };
  }

  async getStatus(orgId: string, importId: string): Promise<DataImportInfo> {
    const [record] = await this.db
      .select()
      .from(dataImports)
      .where(and(eq(dataImports.id, importId), eq(dataImports.orgId, orgId)))
      .limit(1);
    if (!record) throw new NotFoundException('Import not found');
    return this.toImportInfo(record);
  }

  async getHistory(orgId: string): Promise<DataImportInfo[]> {
    const records = await this.db
      .select()
      .from(dataImports)
      .where(eq(dataImports.orgId, orgId))
      .orderBy(sql`${dataImports.createdAt} desc`)
      .limit(20);
    return records.map((r) => this.toImportInfo(r));
  }

  generateTemplate(type: string): Buffer {
    if (type === 'employees') {
      return ExcelParser.generateTemplate(
        EMPLOYEE_IMPORT_FIELDS.map((f) => ({ field: f.field, label: f.label })),
      );
    }
    throw new BadRequestException(`Unknown template type: ${type}`);
  }

  private toImportInfo(record: any): DataImportInfo {
    return {
      id: record.id,
      type: record.type,
      fileName: record.fileName,
      status: record.status,
      totalRows: record.totalRows ?? 0,
      validRows: record.validRows ?? 0,
      errorRows: record.errorRows ?? 0,
      importedRows: record.importedRows ?? 0,
      createdAt: record.createdAt?.toISOString?.() ?? record.createdAt,
      completedAt:
        record.completedAt?.toISOString?.() ?? record.completedAt ?? undefined,
    };
  }
}
