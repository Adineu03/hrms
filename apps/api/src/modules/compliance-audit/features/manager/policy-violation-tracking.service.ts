import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PolicyViolationTrackingService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listViolations(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.ethicsComplaints)
      .where(
        and(
          eq(schema.ethicsComplaints.orgId, orgId),
          eq(schema.ethicsComplaints.category, 'policy_violation'),
          eq(schema.ethicsComplaints.isActive, true),
        ),
      )
      .orderBy(schema.ethicsComplaints.createdAt);

    return { data: rows, meta: { total: rows.length } };
  }

  async createViolation(
    orgId: string,
    userId: string,
    dto: {
      employeeId: string;
      policyId: string;
      violationType: string;
      description: string;
      severity: string;
    },
  ) {
    const referenceCode = 'VIO-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const [row] = await this.db
      .insert(schema.ethicsComplaints)
      .values({
        orgId,
        referenceCode,
        category: 'policy_violation',
        description: dto.description,
        isAnonymous: false,
        reporterEmployeeId: userId,
        status: 'received',
      })
      .returning();

    return { data: row };
  }

  async recordDisciplinaryAction(orgId: string, userId: string, id: string, dto: { action: string; notes?: string }) {
    const existing = await this.db
      .select()
      .from(schema.ethicsComplaints)
      .where(
        and(
          eq(schema.ethicsComplaints.id, id),
          eq(schema.ethicsComplaints.orgId, orgId),
          eq(schema.ethicsComplaints.category, 'policy_violation'),
          eq(schema.ethicsComplaints.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Policy violation record not found');

    const notesText = dto.notes ? `[Disciplinary Action: ${dto.action}] ${dto.notes}` : `[Disciplinary Action: ${dto.action}]`;

    const [row] = await this.db
      .update(schema.ethicsComplaints)
      .set({
        status: 'findings',
        investigationNotes: notesText,
        investigatorId: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.ethicsComplaints.id, id), eq(schema.ethicsComplaints.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getViolationHistory(orgId: string, userId: string, employeeId: string) {
    const rows = await this.db
      .select()
      .from(schema.ethicsComplaints)
      .where(
        and(
          eq(schema.ethicsComplaints.orgId, orgId),
          eq(schema.ethicsComplaints.category, 'policy_violation'),
          eq(schema.ethicsComplaints.reporterEmployeeId, employeeId),
          eq(schema.ethicsComplaints.isActive, true),
        ),
      )
      .orderBy(schema.ethicsComplaints.createdAt);

    return { data: rows, meta: { total: rows.length, employeeId } };
  }
}
