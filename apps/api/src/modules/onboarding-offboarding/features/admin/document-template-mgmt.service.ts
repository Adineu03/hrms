import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

// Template category used to distinguish document templates from employee documents
const TEMPLATE_CATEGORY = 'template';

// System-level employee ID used for org-level templates (not tied to a specific employee)
const SYSTEM_EMPLOYEE_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class DocumentTemplateMgmtService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listTemplates(
    orgId: string,
    filters: { templateType?: string; status?: string; page?: number; limit?: number },
  ) {
    const conditions: any[] = [
      eq(schema.documents.orgId, orgId),
      eq(schema.documents.category, TEMPLATE_CATEGORY),
    ];

    if (filters.templateType) {
      conditions.push(
        sql`${schema.documents.metadata}->>'templateType' = ${filters.templateType}`,
      );
    }
    if (filters.status) {
      conditions.push(
        sql`${schema.documents.metadata}->>'status' = ${filters.status}`,
      );
    }

    const rows = await this.db
      .select()
      .from(schema.documents)
      .where(and(...conditions))
      .orderBy(desc(schema.documents.createdAt));

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const paginated = rows.slice(offset, offset + limit);

    return {
      data: paginated.map((r) => this.toTemplateDto(r)),
      meta: {
        total: rows.length,
        page,
        limit,
        totalPages: Math.ceil(rows.length / limit),
      },
    };
  }

  async createTemplate(orgId: string, data: Record<string, any>) {
    if (!data.name) throw new BadRequestException('Template name is required');

    const metadata = {
      templateType: data.templateType ?? 'general',
      status: 'active',
      content: data.content ?? '',
      dynamicFields: data.dynamicFields ?? [],
      versionHistory: [
        {
          version: '1',
          updatedAt: new Date().toISOString(),
          changeNote: 'Initial version',
        },
      ],
      digitalSignatureEnabled: data.digitalSignatureEnabled ?? false,
      complianceCategory: data.complianceCategory ?? null,
      applicableTo: data.applicableTo ?? 'all',
      ...(data.metadata ?? {}),
    };

    const [created] = await this.db
      .insert(schema.documents)
      .values({
        orgId,
        employeeId: SYSTEM_EMPLOYEE_ID,
        category: TEMPLATE_CATEGORY,
        name: data.name,
        description: data.description ?? null,
        fileUrl: data.fileUrl ?? null,
        fileSize: data.fileSize ?? null,
        mimeType: data.mimeType ?? 'text/html',
        version: '1',
        metadata,
      })
      .returning();

    return this.toTemplateDto(created);
  }

  async getTemplate(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.id, id),
          eq(schema.documents.orgId, orgId),
          eq(schema.documents.category, TEMPLATE_CATEGORY),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Document template not found');

    return this.toTemplateDto(row);
  }

  async updateTemplate(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.id, id),
          eq(schema.documents.orgId, orgId),
          eq(schema.documents.category, TEMPLATE_CATEGORY),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Document template not found');

    const existingMeta = (existing.metadata as Record<string, any>) ?? {};
    const currentVersion = parseInt(existing.version ?? '1', 10);
    const newVersion = (currentVersion + 1).toString();

    // Build version history
    const versionHistory = existingMeta.versionHistory ?? [];
    versionHistory.push({
      version: newVersion,
      updatedAt: new Date().toISOString(),
      changeNote: data.changeNote ?? `Updated to version ${newVersion}`,
    });

    const updatedMeta = {
      ...existingMeta,
      ...(data.templateType !== undefined && { templateType: data.templateType }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.dynamicFields !== undefined && { dynamicFields: data.dynamicFields }),
      ...(data.digitalSignatureEnabled !== undefined && { digitalSignatureEnabled: data.digitalSignatureEnabled }),
      ...(data.complianceCategory !== undefined && { complianceCategory: data.complianceCategory }),
      ...(data.applicableTo !== undefined && { applicableTo: data.applicableTo }),
      versionHistory,
    };

    const updates: Record<string, any> = {
      updatedAt: new Date(),
      version: newVersion,
      previousVersionId: existing.id,
      metadata: updatedMeta,
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.fileUrl !== undefined) updates.fileUrl = data.fileUrl;
    if (data.fileSize !== undefined) updates.fileSize = data.fileSize;
    if (data.mimeType !== undefined) updates.mimeType = data.mimeType;

    await this.db
      .update(schema.documents)
      .set(updates)
      .where(
        and(
          eq(schema.documents.id, id),
          eq(schema.documents.orgId, orgId),
        ),
      );

    return this.getTemplate(orgId, id);
  }

  async softDelete(orgId: string, id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.id, id),
          eq(schema.documents.orgId, orgId),
          eq(schema.documents.category, TEMPLATE_CATEGORY),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Document template not found');

    // Mark as inactive via metadata status since documents table doesn't have isActive
    const existingMeta = (existing.metadata as Record<string, any>) ?? {};
    await this.db
      .update(schema.documents)
      .set({
        metadata: { ...existingMeta, status: 'archived' },
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.documents.id, id),
          eq(schema.documents.orgId, orgId),
        ),
      );

    return { success: true, message: 'Document template archived' };
  }

  async getAvailableFields(_orgId: string) {
    return {
      data: [
        { field: '{{employee_name}}', label: 'Employee Full Name', type: 'string' },
        { field: '{{employee_first_name}}', label: 'Employee First Name', type: 'string' },
        { field: '{{employee_last_name}}', label: 'Employee Last Name', type: 'string' },
        { field: '{{employee_email}}', label: 'Employee Email', type: 'string' },
        { field: '{{employee_id}}', label: 'Employee ID', type: 'string' },
        { field: '{{designation}}', label: 'Designation', type: 'string' },
        { field: '{{department}}', label: 'Department', type: 'string' },
        { field: '{{date_of_joining}}', label: 'Date of Joining', type: 'date' },
        { field: '{{salary}}', label: 'Salary / CTC', type: 'number' },
        { field: '{{reporting_manager}}', label: 'Reporting Manager', type: 'string' },
        { field: '{{company_name}}', label: 'Company Name', type: 'string' },
        { field: '{{company_address}}', label: 'Company Address', type: 'string' },
        { field: '{{current_date}}', label: 'Current Date', type: 'date' },
        { field: '{{probation_period}}', label: 'Probation Period', type: 'string' },
        { field: '{{notice_period}}', label: 'Notice Period', type: 'string' },
        { field: '{{work_location}}', label: 'Work Location', type: 'string' },
        { field: '{{last_working_date}}', label: 'Last Working Date', type: 'date' },
        { field: '{{exit_type}}', label: 'Exit Type', type: 'string' },
      ],
    };
  }

  private toTemplateDto(row: typeof schema.documents.$inferSelect) {
    const meta = (row.metadata as Record<string, any>) ?? {};
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      description: row.description,
      templateType: meta.templateType ?? 'general',
      status: meta.status ?? 'active',
      content: meta.content ?? '',
      dynamicFields: meta.dynamicFields ?? [],
      digitalSignatureEnabled: meta.digitalSignatureEnabled ?? false,
      complianceCategory: meta.complianceCategory ?? null,
      applicableTo: meta.applicableTo ?? 'all',
      version: row.version,
      previousVersionId: row.previousVersionId,
      versionHistory: meta.versionHistory ?? [],
      fileUrl: row.fileUrl,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      metadata: meta,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
