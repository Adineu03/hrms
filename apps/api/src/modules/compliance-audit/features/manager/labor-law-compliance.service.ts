import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LaborLawComplianceService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getWorkingHoursCompliance(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.complianceChecklists)
      .where(
        and(
          eq(schema.complianceChecklists.orgId, orgId),
          eq(schema.complianceChecklists.category, 'labor-law'),
          eq(schema.complianceChecklists.isActive, true),
        ),
      )
      .orderBy(schema.complianceChecklists.createdAt);

    return {
      data: {
        checklists: rows,
        summary: {
          total: rows.length,
          completed: rows.filter((r) => r.status === 'completed').length,
          pending: rows.filter((r) => r.status === 'pending').length,
          overdue: rows.filter((r) => r.status === 'overdue').length,
        },
      },
    };
  }

  async getLeaveCompliance(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.complianceChecklists)
      .where(
        and(
          eq(schema.complianceChecklists.orgId, orgId),
          eq(schema.complianceChecklists.category, 'labor-law'),
          eq(schema.complianceChecklists.isActive, true),
        ),
      )
      .orderBy(schema.complianceChecklists.createdAt);

    const leaveRelated = rows.filter(
      (r) => r.title.toLowerCase().includes('leave') || (r.description && r.description.toLowerCase().includes('leave')),
    );

    return {
      data: {
        checklists: leaveRelated,
        summary: {
          total: leaveRelated.length,
          completed: leaveRelated.filter((r) => r.status === 'completed').length,
          pending: leaveRelated.filter((r) => r.status === 'pending').length,
        },
      },
    };
  }

  async getHealthSafetyChecklists(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.complianceChecklists)
      .where(
        and(
          eq(schema.complianceChecklists.orgId, orgId),
          eq(schema.complianceChecklists.category, 'safety'),
          eq(schema.complianceChecklists.isActive, true),
        ),
      )
      .orderBy(schema.complianceChecklists.dueDate);

    return {
      data: rows,
      meta: {
        total: rows.length,
        completed: rows.filter((r) => r.status === 'completed').length,
        pending: rows.filter((r) => r.status === 'pending').length,
      },
    };
  }

  async getContractorClassification(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.complianceChecklists)
      .where(
        and(
          eq(schema.complianceChecklists.orgId, orgId),
          eq(schema.complianceChecklists.category, 'labor-law'),
          eq(schema.complianceChecklists.isActive, true),
        ),
      )
      .orderBy(schema.complianceChecklists.createdAt);

    const contractorRelated = rows.filter(
      (r) => r.title.toLowerCase().includes('contractor') || (r.description && r.description.toLowerCase().includes('contractor')),
    );

    return {
      data: {
        checklists: contractorRelated,
        summary: {
          total: contractorRelated.length,
          completed: contractorRelated.filter((r) => r.status === 'completed').length,
          pending: contractorRelated.filter((r) => r.status === 'pending').length,
        },
      },
    };
  }
}
