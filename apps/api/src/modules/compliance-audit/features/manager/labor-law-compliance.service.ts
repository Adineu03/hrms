import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

/** Deterministic anchor matching the seed's SEED_TODAY so demo dates are stable. */
const ANCHOR = new Date('2026-06-09T00:00:00Z');
function anchorPlusDays(n: number): string {
  const d = new Date(ANCHOR);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString();
}

@Injectable()
export class LaborLawComplianceService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  /** Resolve the manager's direct reports (users + designation) by managerId === userId. */
  private async getTeamMembers(orgId: string, managerId: string) {
    return this.db
      .select({
        userId: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        designationName: schema.designations.name,
      })
      .from(schema.users)
      .innerJoin(schema.employeeProfiles, eq(schema.users.id, schema.employeeProfiles.userId))
      .leftJoin(schema.designations, eq(schema.employeeProfiles.designationId, schema.designations.id))
      .where(and(eq(schema.users.orgId, orgId), eq(schema.employeeProfiles.managerId, managerId)));
  }

  private memberName(m: { firstName: string | null; lastName: string | null }): string {
    return `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || 'Unknown';
  }

  /** Per-team-member working-hours compliance (deterministic, derived from member index). */
  async getWorkingHoursCompliance(orgId: string, userId: string) {
    const members = await this.getTeamMembers(orgId, userId);
    const rows = members.map((m, idx) => {
      const weeklyHours = 38 + (idx % 12); // 38..49
      const maxAllowed = 48;
      const overtimeHours = Math.max(0, weeklyHours - 40);
      const status: 'compliant' | 'warning' | 'non_compliant' =
        weeklyHours <= 44 ? 'compliant' : weeklyHours <= 48 ? 'warning' : 'non_compliant';
      return {
        employeeId: m.userId,
        employeeName: this.memberName(m),
        weeklyHours,
        maxAllowed,
        overtimeHours,
        status,
      };
    });

    return {
      data: rows,
      meta: {
        total: rows.length,
        compliant: rows.filter((r) => r.status === 'compliant').length,
        warning: rows.filter((r) => r.status === 'warning').length,
        nonCompliant: rows.filter((r) => r.status === 'non_compliant').length,
      },
    };
  }

  /** Per-team-member statutory leave compliance (deterministic). */
  async getLeaveCompliance(orgId: string, userId: string) {
    const members = await this.getTeamMembers(orgId, userId);
    const rows = members.map((m, idx) => {
      const mandatoryLeavesRequired = 15;
      const mandatoryLeavesTaken = 5 + (idx % 11); // 5..15
      const carryoverDays = idx % 6;
      const status: 'compliant' | 'warning' | 'non_compliant' =
        mandatoryLeavesTaken >= 10 ? 'compliant' : mandatoryLeavesTaken >= 7 ? 'warning' : 'non_compliant';
      return {
        employeeId: m.userId,
        employeeName: this.memberName(m),
        mandatoryLeavesTaken,
        mandatoryLeavesRequired,
        carryoverDays,
        status,
      };
    });

    return {
      data: rows,
      meta: {
        total: rows.length,
        compliant: rows.filter((r) => r.status === 'compliant').length,
        nonCompliant: rows.filter((r) => r.status === 'non_compliant').length,
      },
    };
  }

  /** Health & safety checklists (real 'safety' category compliance checklists). */
  async getHealthSafetyChecklists(orgId: string, _userId: string) {
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
      data: rows.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        status: r.status,
        dueDate: r.dueDate,
        completedDate: r.completedAt,
        assignedTo: r.assignedTo ?? undefined,
      })),
      meta: {
        total: rows.length,
        completed: rows.filter((r) => r.status === 'completed').length,
        pending: rows.filter((r) => r.status === 'pending').length,
      },
    };
  }

  /** Contractor / consultant worker classification register (deterministic demo data). */
  async getContractorClassification(_orgId: string, _userId: string) {
    const seed = [
      { name: 'Rapid Logistics Pvt Ltd', type: 'contractor' as const, risk: 'low' as const, status: 'compliant' as const, notes: 'Facilities and logistics; contract reviewed annually.' },
      { name: 'Aarav Sharma (Design Consultant)', type: 'consultant' as const, risk: 'medium' as const, status: 'review_needed' as const, notes: 'Engaged > 6 months — review for misclassification risk.' },
      { name: 'SecureGuard Services', type: 'contractor' as const, risk: 'low' as const, status: 'compliant' as const, notes: 'On-site security; statutory coverage verified.' },
      { name: 'Meera Iyer (Marketing Consultant)', type: 'consultant' as const, risk: 'high' as const, status: 'non_compliant' as const, notes: 'Full-time hours on long engagement — convert or restructure contract.' },
    ];
    const rows = seed.map((c, idx) => ({
      id: `contractor-${idx + 1}`,
      name: c.name,
      type: c.type,
      riskLevel: c.risk,
      lastReviewDate: anchorPlusDays(-30 - idx * 25),
      nextReviewDate: anchorPlusDays(180 - idx * 20),
      complianceStatus: c.status,
      notes: c.notes,
    }));

    return {
      data: rows,
      meta: {
        total: rows.length,
        needsReview: rows.filter((r) => r.complianceStatus !== 'compliant').length,
      },
    };
  }
}
