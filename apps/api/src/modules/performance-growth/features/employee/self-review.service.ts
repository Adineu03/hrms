import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class SelfReviewService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getCurrentSelfReview(orgId: string, userId: string) {
    const [row] = await this.db.select({ assignment: schema.reviewAssignments, cycle: schema.reviewCycles })
      .from(schema.reviewAssignments)
      .innerJoin(schema.reviewCycles, eq(schema.reviewAssignments.cycleId, schema.reviewCycles.id))
      .where(and(eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.employeeId, userId), eq(schema.reviewAssignments.reviewerType, 'self'), eq(schema.reviewAssignments.isActive, true), eq(schema.reviewCycles.status, 'active')))
      .orderBy(desc(schema.reviewCycles.createdAt)).limit(1);
    if (!row) return null;
    return { ...row.assignment, cycleName: row.cycle.name, cycleType: row.cycle.type, ratingScale: row.cycle.ratingScaleType, startDate: row.cycle.startDate, endDate: row.cycle.endDate };
  }

  async getReviewCycles(orgId: string, userId: string) {
    const cycles = await this.db.select().from(schema.reviewCycles)
      .where(and(eq(schema.reviewCycles.orgId, orgId), eq(schema.reviewCycles.status, 'active'), eq(schema.reviewCycles.isActive, true)));
    return { data: cycles };
  }

  async saveSelfReview(orgId: string, userId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db.select().from(schema.reviewAssignments)
      .where(and(eq(schema.reviewAssignments.id, id), eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.employeeId, userId))).limit(1);
    if (!existing) throw new NotFoundException('Review assignment not found');
    const updates: Record<string, any> = { status: 'in_progress', updatedAt: new Date() };
    if (data.selfRating !== undefined) updates.selfRating = data.selfRating.toString();
    if (data.selfComments !== undefined) updates.selfComments = data.selfComments;
    if (data.achievements !== undefined) updates.achievements = data.achievements;
    if (data.competencyRatings !== undefined) updates.competencyRatings = data.competencyRatings;
    if (data.improvementAreas !== undefined) updates.improvementAreas = data.improvementAreas;
    await this.db.update(schema.reviewAssignments).set(updates).where(and(eq(schema.reviewAssignments.id, id), eq(schema.reviewAssignments.orgId, orgId)));
    return this.getCurrentSelfReview(orgId, userId);
  }

  async submitSelfReview(orgId: string, userId: string, id: string) {
    const [existing] = await this.db.select().from(schema.reviewAssignments)
      .where(and(eq(schema.reviewAssignments.id, id), eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.employeeId, userId))).limit(1);
    if (!existing) throw new NotFoundException('Review assignment not found');
    await this.db.update(schema.reviewAssignments).set({ status: 'submitted', updatedAt: new Date() })
      .where(and(eq(schema.reviewAssignments.id, id), eq(schema.reviewAssignments.orgId, orgId)));
    return { success: true, message: 'Self-review submitted' };
  }

  async getPreviousSelfReviews(orgId: string, userId: string) {
    const rows = await this.db.select({ assignment: schema.reviewAssignments, cycle: schema.reviewCycles })
      .from(schema.reviewAssignments)
      .innerJoin(schema.reviewCycles, eq(schema.reviewAssignments.cycleId, schema.reviewCycles.id))
      .where(and(eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.employeeId, userId), eq(schema.reviewAssignments.reviewerType, 'self'), eq(schema.reviewAssignments.isActive, true)))
      .orderBy(desc(schema.reviewCycles.startDate));
    return { data: rows.map(r => ({ ...r.assignment, cycleName: r.cycle.name })) };
  }

  async getGoalDataForReview(orgId: string, userId: string, reviewId: string) {
    const goals = await this.db.select().from(schema.goals)
      .where(and(eq(schema.goals.orgId, orgId), eq(schema.goals.employeeId, userId), eq(schema.goals.isActive, true), eq(schema.goals.isTemplate, false)));
    return { goals: goals.map(g => ({ id: g.id, title: g.title, status: g.status, progress: g.progress, category: g.category })) };
  }
}
