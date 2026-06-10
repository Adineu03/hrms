import { Inject, Injectable } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamCompositionAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  /** Direct reports — the single source of truth for "team size". */
  private async getTeamProfiles(orgId: string, managerId: string) {
    return this.db
      .select({
        userId: schema.employeeProfiles.userId,
        gradeId: schema.employeeProfiles.gradeId,
        dateOfJoining: schema.employeeProfiles.dateOfJoining,
      })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
  }

  async getTeamComposition(orgId: string, managerId: string) {
    const team = await this.getTeamProfiles(orgId, managerId);
    const teamIds = team.map((t) => t.userId);

    const transfers = teamIds.length
      ? await this.db
          .select()
          .from(schema.internalTransferRequests)
          .where(
            and(
              eq(schema.internalTransferRequests.orgId, orgId),
              eq(schema.internalTransferRequests.isActive, true),
              eq(schema.internalTransferRequests.requestType, 'promotion'),
              inArray(schema.internalTransferRequests.employeeId, teamIds),
            ),
          )
      : [];

    // Average tenure in months from dateOfJoining
    const now = new Date();
    const tenures = team
      .map((t) => {
        if (!t.dateOfJoining) return null;
        const doj = new Date(t.dateOfJoining);
        if (Number.isNaN(doj.getTime())) return null;
        return Math.max(
          0,
          (now.getFullYear() - doj.getFullYear()) * 12 + (now.getMonth() - doj.getMonth()),
        );
      })
      .filter((m): m is number => m !== null);
    const avgTenureMonths = tenures.length
      ? Math.round(tenures.reduce((s, m) => s + m, 0) / tenures.length)
      : 0;

    const tenureBuckets = [
      { label: '< 1y', min: 0, max: 11 },
      { label: '1–2y', min: 12, max: 23 },
      { label: '2–4y', min: 24, max: 47 },
      { label: '4y+', min: 48, max: Infinity },
    ];
    const tenureDistribution = tenureBuckets.map((b) => ({
      bucket: b.label,
      count: tenures.filter((m) => m >= b.min && m <= b.max).length,
    }));

    const gradeDistribution = (await this.computeGradeDistribution(orgId, team)).rows;

    return {
      data: {
        totalTeamSize: team.length,
        avgTenureMonths,
        gradeDistribution,
        tenureDistribution,
        promotionsThisCycle: transfers.length,
      },
    };
  }

  async getGradeDistribution(orgId: string, managerId: string) {
    const team = await this.getTeamProfiles(orgId, managerId);
    const { rows } = await this.computeGradeDistribution(orgId, team);
    return { data: rows, meta: { total: rows.length, teamSize: team.length } };
  }

  /** Counts the manager's direct reports per grade (not grade definitions). */
  private async computeGradeDistribution(
    orgId: string,
    team: { gradeId: string | null }[],
  ) {
    const gradeIds = [...new Set(team.map((t) => t.gradeId).filter((g): g is string => !!g))];
    if (gradeIds.length === 0) return { rows: [] as { gradeCode: string; gradeLevel: number; count: number }[] };

    const gradeRows = await this.db
      .select({ id: schema.grades.id, name: schema.grades.name, level: schema.grades.level })
      .from(schema.grades)
      .where(and(eq(schema.grades.orgId, orgId), inArray(schema.grades.id, gradeIds)));
    const gradeById = new Map(gradeRows.map((g) => [g.id, g]));

    const counts = new Map<string, { gradeCode: string; gradeLevel: number; count: number }>();
    for (const t of team) {
      if (!t.gradeId) continue;
      const grade = gradeById.get(t.gradeId);
      if (!grade) continue;
      const code = `L${grade.level}`;
      if (!counts.has(code)) {
        counts.set(code, { gradeCode: code, gradeLevel: grade.level ?? 0, count: 0 });
      }
      counts.get(code)!.count += 1;
    }

    const rows = [...counts.values()].sort((a, b) => b.gradeLevel - a.gradeLevel);
    return { rows };
  }
}
