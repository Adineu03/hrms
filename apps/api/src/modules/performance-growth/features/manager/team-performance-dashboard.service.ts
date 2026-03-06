import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamPerformanceDashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const members = await this.db.select({ userId: schema.employeeProfiles.userId }).from(schema.employeeProfiles)
      .where(and(eq(schema.employeeProfiles.orgId, orgId), eq(schema.employeeProfiles.managerId, managerId)));
    return members.map(m => m.userId);
  }

  async getTeamOverview(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { teamSize: 0, members: [], avgRating: null, goalsOnTrack: 0, pendingReviews: 0 };
    const members = await this.db.select().from(schema.users).where(and(eq(schema.users.orgId, orgId), inArray(schema.users.id, teamIds)));
    const goals = await this.db.select().from(schema.goals).where(and(eq(schema.goals.orgId, orgId), inArray(schema.goals.employeeId, teamIds), eq(schema.goals.isActive, true), eq(schema.goals.isTemplate, false)));
    const reviews = await this.db.select().from(schema.reviewAssignments).where(and(eq(schema.reviewAssignments.orgId, orgId), inArray(schema.reviewAssignments.employeeId, teamIds), eq(schema.reviewAssignments.isActive, true)));
    const ratings = reviews.map(r => Number(r.finalRating ?? r.managerRating ?? 0)).filter(r => r > 0);
    const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(2) : null;
    const onTrack = goals.filter(g => g.status === 'on_track' || g.status === 'active').length;
    const pending = reviews.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
    return { teamSize: teamIds.length, avgRating, goalsOnTrack: onTrack, totalGoals: goals.length, pendingReviews: pending,
      members: members.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}`, email: m.email })) };
  }

  async getTeamGoalProgress(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [] };
    const goals = await this.db.select({ goal: schema.goals, employee: schema.users }).from(schema.goals)
      .innerJoin(schema.users, eq(schema.goals.employeeId, schema.users.id))
      .where(and(eq(schema.goals.orgId, orgId), inArray(schema.goals.employeeId, teamIds), eq(schema.goals.isActive, true), eq(schema.goals.isTemplate, false)))
      .orderBy(desc(schema.goals.dueDate));
    return { data: goals.map(g => ({ ...g.goal, employeeName: `${g.employee.firstName} ${g.employee.lastName}` })) };
  }

  async getPendingActions(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { pendingReviews: [], overdueGoals: [] };
    const pendingReviews = await this.db.select({ assignment: schema.reviewAssignments, employee: schema.users })
      .from(schema.reviewAssignments).innerJoin(schema.users, eq(schema.reviewAssignments.employeeId, schema.users.id))
      .where(and(eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.reviewerId, managerId), eq(schema.reviewAssignments.status, 'pending'), eq(schema.reviewAssignments.isActive, true)));
    const overdueGoals = await this.db.select({ goal: schema.goals, employee: schema.users }).from(schema.goals)
      .innerJoin(schema.users, eq(schema.goals.employeeId, schema.users.id))
      .where(and(eq(schema.goals.orgId, orgId), inArray(schema.goals.employeeId, teamIds), eq(schema.goals.status, 'behind'), eq(schema.goals.isActive, true)));
    return { pendingReviews: pendingReviews.map(r => ({ ...r.assignment, employeeName: `${r.employee.firstName} ${r.employee.lastName}` })),
      overdueGoals: overdueGoals.map(g => ({ ...g.goal, employeeName: `${g.employee.firstName} ${g.employee.lastName}` })) };
  }

  async getTeamDistribution(orgId: string, managerId: string, cycleId?: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { distribution: {}, total: 0 };
    const conditions: any[] = [eq(schema.reviewAssignments.orgId, orgId), inArray(schema.reviewAssignments.employeeId, teamIds), eq(schema.reviewAssignments.isActive, true)];
    if (cycleId) conditions.push(eq(schema.reviewAssignments.cycleId, cycleId));
    const rows = await this.db.select().from(schema.reviewAssignments).where(and(...conditions));
    const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const r of rows) { const rating = r.finalRating ?? r.managerRating; if (rating) { dist[Math.min(5, Math.max(1, Math.round(Number(rating)))).toString()]++; } }
    return { distribution: dist, total: rows.length };
  }
}
