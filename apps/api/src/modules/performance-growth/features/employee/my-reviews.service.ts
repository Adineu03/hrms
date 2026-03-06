import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyReviewsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getCurrentReview(orgId: string, userId: string) {
    const rows = await this.db.select({ assignment: schema.reviewAssignments, cycle: schema.reviewCycles })
      .from(schema.reviewAssignments)
      .innerJoin(schema.reviewCycles, eq(schema.reviewAssignments.cycleId, schema.reviewCycles.id))
      .where(and(eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.employeeId, userId), eq(schema.reviewAssignments.isActive, true), eq(schema.reviewCycles.status, 'active')))
      .orderBy(desc(schema.reviewCycles.createdAt)).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    return { ...r.assignment, cycleName: r.cycle.name, cycleType: r.cycle.type, startDate: r.cycle.startDate, endDate: r.cycle.endDate, ratingScale: r.cycle.ratingScaleType };
  }

  async getCompletedReviews(orgId: string, userId: string) {
    const rows = await this.db.select({ assignment: schema.reviewAssignments, cycle: schema.reviewCycles })
      .from(schema.reviewAssignments)
      .innerJoin(schema.reviewCycles, eq(schema.reviewAssignments.cycleId, schema.reviewCycles.id))
      .where(and(eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.employeeId, userId), eq(schema.reviewAssignments.isActive, true)))
      .orderBy(desc(schema.reviewCycles.startDate));
    return { data: rows.filter(r => r.assignment.status === 'submitted' || r.assignment.status === 'acknowledged').map(r => ({ ...r.assignment, cycleName: r.cycle.name, cycleType: r.cycle.type })) };
  }

  async getReviewDetail(orgId: string, userId: string, id: string) {
    const [row] = await this.db.select({ assignment: schema.reviewAssignments, cycle: schema.reviewCycles })
      .from(schema.reviewAssignments)
      .innerJoin(schema.reviewCycles, eq(schema.reviewAssignments.cycleId, schema.reviewCycles.id))
      .where(and(eq(schema.reviewAssignments.id, id), eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.employeeId, userId))).limit(1);
    if (!row) throw new NotFoundException('Review not found');
    return { ...row.assignment, cycleName: row.cycle.name, cycleType: row.cycle.type, ratingScale: row.cycle.ratingScaleType };
  }

  async acknowledgeReview(orgId: string, userId: string, id: string) {
    await this.getReviewDetail(orgId, userId, id);
    await this.db.update(schema.reviewAssignments).set({ status: 'acknowledged', acknowledgedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.reviewAssignments.id, id), eq(schema.reviewAssignments.orgId, orgId)));
    return { success: true, message: 'Review acknowledged' };
  }

  async appealReview(orgId: string, userId: string, id: string, data: Record<string, any>) {
    await this.getReviewDetail(orgId, userId, id);
    await this.db.update(schema.reviewAssignments).set({ status: 'appealed', appealReason: data.reason, appealStatus: 'pending', updatedAt: new Date() })
      .where(and(eq(schema.reviewAssignments.id, id), eq(schema.reviewAssignments.orgId, orgId)));
    return { success: true, message: 'Appeal submitted' };
  }

  async getYearOverYearComparison(orgId: string, userId: string) {
    const rows = await this.db.select({ assignment: schema.reviewAssignments, cycle: schema.reviewCycles })
      .from(schema.reviewAssignments)
      .innerJoin(schema.reviewCycles, eq(schema.reviewAssignments.cycleId, schema.reviewCycles.id))
      .where(and(eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.employeeId, userId), eq(schema.reviewAssignments.isActive, true)))
      .orderBy(schema.reviewCycles.startDate);
    return { data: rows.map(r => ({ cycleName: r.cycle.name, startDate: r.cycle.startDate, selfRating: r.assignment.selfRating, managerRating: r.assignment.managerRating, finalRating: r.assignment.finalRating })) };
  }
}
