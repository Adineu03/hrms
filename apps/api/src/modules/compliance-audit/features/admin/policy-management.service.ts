import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PolicyManagementService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listPolicies(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.compliancePolicies)
      .where(and(eq(schema.compliancePolicies.orgId, orgId), eq(schema.compliancePolicies.isActive, true)))
      .orderBy(schema.compliancePolicies.createdAt);

    return { data: rows, meta: { total: rows.length } };
  }

  async createPolicy(
    orgId: string,
    dto: {
      title: string;
      policyCode: string;
      category: string;
      description?: string;
      content?: string;
      version?: string;
      effectiveDate?: string;
      expiryDate?: string;
      mandatoryAcknowledgment?: boolean;
      reminderCadenceDays?: number;
      appliesToEntity?: string;
      appliesToLocation?: string;
      appliesToDepartment?: string;
      appliesToGrade?: string;
      jurisdiction?: string;
      language?: string;
    },
  ) {
    const [row] = await this.db
      .insert(schema.compliancePolicies)
      .values({
        orgId,
        title: dto.title,
        policyCode: dto.policyCode,
        category: dto.category,
        description: dto.description ?? null,
        content: dto.content ?? null,
        version: dto.version ?? '1.0',
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        mandatoryAcknowledgment: dto.mandatoryAcknowledgment ?? false,
        reminderCadenceDays: dto.reminderCadenceDays ?? 30,
        appliesToEntity: dto.appliesToEntity ?? null,
        appliesToLocation: dto.appliesToLocation ?? null,
        appliesToDepartment: dto.appliesToDepartment ?? null,
        appliesToGrade: dto.appliesToGrade ?? null,
        jurisdiction: dto.jurisdiction ?? null,
        language: dto.language ?? 'en',
      })
      .returning();

    return { data: row };
  }

  async getPolicy(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.compliancePolicies)
      .where(and(eq(schema.compliancePolicies.id, id), eq(schema.compliancePolicies.orgId, orgId), eq(schema.compliancePolicies.isActive, true)));

    if (!rows.length) throw new NotFoundException('Compliance policy not found');

    return { data: rows[0] };
  }

  async updatePolicy(
    orgId: string,
    id: string,
    dto: {
      title?: string;
      policyCode?: string;
      category?: string;
      description?: string;
      content?: string;
      version?: string;
      effectiveDate?: string;
      expiryDate?: string;
      mandatoryAcknowledgment?: boolean;
      reminderCadenceDays?: number;
      appliesToEntity?: string;
      appliesToLocation?: string;
      appliesToDepartment?: string;
      appliesToGrade?: string;
      jurisdiction?: string;
      language?: string;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.compliancePolicies)
      .where(and(eq(schema.compliancePolicies.id, id), eq(schema.compliancePolicies.orgId, orgId), eq(schema.compliancePolicies.isActive, true)));

    if (!existing.length) throw new NotFoundException('Compliance policy not found');

    const [row] = await this.db
      .update(schema.compliancePolicies)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.policyCode !== undefined && { policyCode: dto.policyCode }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.version !== undefined && { version: dto.version }),
        ...(dto.effectiveDate !== undefined && { effectiveDate: new Date(dto.effectiveDate) }),
        ...(dto.expiryDate !== undefined && { expiryDate: new Date(dto.expiryDate) }),
        ...(dto.mandatoryAcknowledgment !== undefined && { mandatoryAcknowledgment: dto.mandatoryAcknowledgment }),
        ...(dto.reminderCadenceDays !== undefined && { reminderCadenceDays: dto.reminderCadenceDays }),
        ...(dto.appliesToEntity !== undefined && { appliesToEntity: dto.appliesToEntity }),
        ...(dto.appliesToLocation !== undefined && { appliesToLocation: dto.appliesToLocation }),
        ...(dto.appliesToDepartment !== undefined && { appliesToDepartment: dto.appliesToDepartment }),
        ...(dto.appliesToGrade !== undefined && { appliesToGrade: dto.appliesToGrade }),
        ...(dto.jurisdiction !== undefined && { jurisdiction: dto.jurisdiction }),
        ...(dto.language !== undefined && { language: dto.language }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.compliancePolicies.id, id), eq(schema.compliancePolicies.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deletePolicy(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.compliancePolicies)
      .where(and(eq(schema.compliancePolicies.id, id), eq(schema.compliancePolicies.orgId, orgId), eq(schema.compliancePolicies.isActive, true)));

    if (!existing.length) throw new NotFoundException('Compliance policy not found');

    const [row] = await this.db
      .update(schema.compliancePolicies)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.compliancePolicies.id, id), eq(schema.compliancePolicies.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async publishPolicy(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.compliancePolicies)
      .where(and(eq(schema.compliancePolicies.id, id), eq(schema.compliancePolicies.orgId, orgId), eq(schema.compliancePolicies.isActive, true)));

    if (!existing.length) throw new NotFoundException('Compliance policy not found');

    const [row] = await this.db
      .update(schema.compliancePolicies)
      .set({ status: 'published', approvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.compliancePolicies.id, id), eq(schema.compliancePolicies.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async archivePolicy(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.compliancePolicies)
      .where(and(eq(schema.compliancePolicies.id, id), eq(schema.compliancePolicies.orgId, orgId), eq(schema.compliancePolicies.isActive, true)));

    if (!existing.length) throw new NotFoundException('Compliance policy not found');

    const [row] = await this.db
      .update(schema.compliancePolicies)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(and(eq(schema.compliancePolicies.id, id), eq(schema.compliancePolicies.orgId, orgId)))
      .returning();

    return { data: row };
  }
}
