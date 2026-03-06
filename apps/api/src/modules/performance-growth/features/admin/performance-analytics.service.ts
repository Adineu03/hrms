import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PerformanceAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getPerformanceDistribution(orgId: string, cycleId?: string) {
    const conditions: any[] = [eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.isActive, true)];
    if (cycleId) conditions.push(eq(schema.reviewAssignments.cycleId, cycleId));
    const rows = await this.db.select().from(schema.reviewAssignments).where(and(...conditions));
    const buckets: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const r of rows) {
      const rating = r.finalRating ?? r.calibratedRating ?? r.managerRating;
      if (rating) { const b = Math.min(5, Math.max(1, Math.round(Number(rating)))).toString(); buckets[b] = (buckets[b] || 0) + 1; }
    }
    return { distribution: buckets, totalReviewed: rows.filter(r => r.finalRating || r.managerRating).length, totalAssignments: rows.length };
  }

  async getDepartmentComparison(orgId: string, cycleId?: string) {
    const conditions: any[] = [eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.isActive, true)];
    if (cycleId) conditions.push(eq(schema.reviewAssignments.cycleId, cycleId));
    const assignments = await this.db.select({ assignment: schema.reviewAssignments, profile: schema.employeeProfiles })
      .from(schema.reviewAssignments)
      .leftJoin(schema.employeeProfiles, eq(schema.reviewAssignments.employeeId, schema.employeeProfiles.userId))
      .where(and(...conditions));
    const deptMap: Record<string, { total: number; sum: number; count: number }> = {};
    for (const r of assignments) {
      const deptId = r.profile?.departmentId ?? 'unassigned';
      if (!deptMap[deptId]) deptMap[deptId] = { total: 0, sum: 0, count: 0 };
      deptMap[deptId].total++;
      const rating = Number(r.assignment.finalRating ?? r.assignment.managerRating ?? 0);
      if (rating > 0) { deptMap[deptId].sum += rating; deptMap[deptId].count++; }
    }
    const departments = await this.db.select().from(schema.departments).where(eq(schema.departments.orgId, orgId));
    const deptNames: Record<string, string> = {};
    for (const d of departments) deptNames[d.id] = d.name;
    return Object.entries(deptMap).map(([id, v]) => ({ departmentId: id, departmentName: deptNames[id] ?? 'Unassigned', totalEmployees: v.total, avgRating: v.count > 0 ? (v.sum / v.count).toFixed(2) : null, reviewedCount: v.count }));
  }

  async getGoalAchievementRates(orgId: string) {
    const goals = await this.db.select().from(schema.goals)
      .where(and(eq(schema.goals.orgId, orgId), eq(schema.goals.isActive, true), eq(schema.goals.isTemplate, false)));
    const total = goals.length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const onTrack = goals.filter(g => g.status === 'on_track' || g.status === 'active').length;
    const atRisk = goals.filter(g => g.status === 'at_risk').length;
    const behind = goals.filter(g => g.status === 'behind').length;
    return { total, completed, onTrack, atRisk, behind, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }

  async getReviewCompletionRates(orgId: string, cycleId?: string) {
    const conditions: any[] = [eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.isActive, true)];
    if (cycleId) conditions.push(eq(schema.reviewAssignments.cycleId, cycleId));
    const rows = await this.db.select().from(schema.reviewAssignments).where(and(...conditions));
    const total = rows.length;
    const submitted = rows.filter(r => r.status === 'submitted' || r.status === 'acknowledged').length;
    const pending = rows.filter(r => r.status === 'pending').length;
    const inProgress = rows.filter(r => r.status === 'in_progress').length;
    return { total, submitted, pending, inProgress, completionRate: total > 0 ? Math.round((submitted / total) * 100) : 0 };
  }

  async getPerformanceTrends(orgId: string) {
    const cycles = await this.db.select().from(schema.reviewCycles)
      .where(and(eq(schema.reviewCycles.orgId, orgId), eq(schema.reviewCycles.isActive, true)))
      .orderBy(schema.reviewCycles.startDate);
    const trends = [];
    for (const cycle of cycles) {
      const assignments = await this.db.select().from(schema.reviewAssignments)
        .where(and(eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.cycleId, cycle.id)));
      const ratings = assignments.map(a => Number(a.finalRating ?? a.managerRating ?? 0)).filter(r => r > 0);
      const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
      trends.push({ cycleId: cycle.id, cycleName: cycle.name, startDate: cycle.startDate, avgRating: avg.toFixed(2), totalReviewed: ratings.length });
    }
    return trends;
  }
}
