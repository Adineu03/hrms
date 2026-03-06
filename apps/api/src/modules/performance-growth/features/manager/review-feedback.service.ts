import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ReviewFeedbackService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const members = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
    return members.map((m) => m.userId);
  }

  async listPendingReviews(orgId: string, managerId: string) {
    const rows = await this.db
      .select({
        id: schema.reviewAssignments.id,
        cycleId: schema.reviewAssignments.cycleId,
        employeeId: schema.reviewAssignments.employeeId,
        status: schema.reviewAssignments.status,
        selfRating: schema.reviewAssignments.selfRating,
        selfComments: schema.reviewAssignments.selfComments,
        achievements: schema.reviewAssignments.achievements,
        competencyRatings: schema.reviewAssignments.competencyRatings,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        cycleName: schema.reviewCycles.name,
        cycleType: schema.reviewCycles.type,
        createdAt: schema.reviewAssignments.createdAt,
      })
      .from(schema.reviewAssignments)
      .innerJoin(schema.users, eq(schema.reviewAssignments.employeeId, schema.users.id))
      .innerJoin(schema.reviewCycles, eq(schema.reviewAssignments.cycleId, schema.reviewCycles.id))
      .where(
        and(
          eq(schema.reviewAssignments.orgId, orgId),
          eq(schema.reviewAssignments.reviewerId, managerId),
          eq(schema.reviewAssignments.isActive, true),
          inArray(schema.reviewAssignments.status, ['pending', 'in_progress', 'self_review_submitted']),
        ),
      )
      .orderBy(schema.reviewAssignments.createdAt);

    return {
      data: rows.map((r) => ({
        id: r.id,
        cycleId: r.cycleId,
        cycleName: r.cycleName,
        cycleType: r.cycleType,
        employeeId: r.employeeId,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
        status: r.status,
        selfRating: r.selfRating ? Number(r.selfRating) : null,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
      meta: { total: rows.length },
    };
  }

  async getReviewAssignment(orgId: string, id: string) {
    const [row] = await this.db
      .select({
        id: schema.reviewAssignments.id,
        cycleId: schema.reviewAssignments.cycleId,
        employeeId: schema.reviewAssignments.employeeId,
        reviewerId: schema.reviewAssignments.reviewerId,
        status: schema.reviewAssignments.status,
        selfRating: schema.reviewAssignments.selfRating,
        selfComments: schema.reviewAssignments.selfComments,
        managerRating: schema.reviewAssignments.managerRating,
        managerComments: schema.reviewAssignments.managerComments,
        finalRating: schema.reviewAssignments.finalRating,
        calibratedRating: schema.reviewAssignments.calibratedRating,
        achievements: schema.reviewAssignments.achievements,
        improvementAreas: schema.reviewAssignments.improvementAreas,
        goalData: schema.reviewAssignments.goalData,
        competencyRatings: schema.reviewAssignments.competencyRatings,
        acknowledgedAt: schema.reviewAssignments.acknowledgedAt,
        metadata: schema.reviewAssignments.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        cycleName: schema.reviewCycles.name,
        cycleType: schema.reviewCycles.type,
        cycleStartDate: schema.reviewCycles.startDate,
        cycleEndDate: schema.reviewCycles.endDate,
        createdAt: schema.reviewAssignments.createdAt,
        updatedAt: schema.reviewAssignments.updatedAt,
      })
      .from(schema.reviewAssignments)
      .innerJoin(schema.users, eq(schema.reviewAssignments.employeeId, schema.users.id))
      .innerJoin(schema.reviewCycles, eq(schema.reviewAssignments.cycleId, schema.reviewCycles.id))
      .where(
        and(
          eq(schema.reviewAssignments.id, id),
          eq(schema.reviewAssignments.orgId, orgId),
          eq(schema.reviewAssignments.isActive, true),
        ),
      );

    if (!row) throw new NotFoundException('Review assignment not found');

    return {
      ...row,
      employeeName: `${row.firstName} ${row.lastName ?? ''}`.trim(),
      selfRating: row.selfRating ? Number(row.selfRating) : null,
      managerRating: row.managerRating ? Number(row.managerRating) : null,
      finalRating: row.finalRating ? Number(row.finalRating) : null,
      calibratedRating: row.calibratedRating ? Number(row.calibratedRating) : null,
      acknowledgedAt: row.acknowledgedAt?.toISOString?.() ?? null,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    };
  }

  async submitManagerReview(orgId: string, managerId: string, id: string, body: {
    managerRating: number;
    managerComments?: string;
    improvementAreas?: any[];
    competencyRatings?: any;
  }) {
    const [assignment] = await this.db
      .select({ id: schema.reviewAssignments.id, reviewerId: schema.reviewAssignments.reviewerId, status: schema.reviewAssignments.status })
      .from(schema.reviewAssignments)
      .where(
        and(
          eq(schema.reviewAssignments.id, id),
          eq(schema.reviewAssignments.orgId, orgId),
          eq(schema.reviewAssignments.isActive, true),
        ),
      );

    if (!assignment) throw new NotFoundException('Review assignment not found');
    if (assignment.reviewerId !== managerId) throw new BadRequestException('You are not the reviewer for this assignment');
    if (assignment.status === 'completed') throw new BadRequestException('Review already completed');

    const updateData: Record<string, any> = {
      managerRating: body.managerRating.toString(),
      status: 'manager_reviewed',
      finalRating: body.managerRating.toString(),
      updatedAt: new Date(),
    };
    if (body.managerComments !== undefined) updateData.managerComments = body.managerComments;
    if (body.improvementAreas !== undefined) updateData.improvementAreas = body.improvementAreas;
    if (body.competencyRatings !== undefined) updateData.competencyRatings = body.competencyRatings;

    const [updated] = await this.db
      .update(schema.reviewAssignments)
      .set(updateData)
      .where(eq(schema.reviewAssignments.id, id))
      .returning();

    return {
      message: 'Manager review submitted successfully',
      id: updated.id,
      status: updated.status,
      managerRating: Number(updated.managerRating),
    };
  }

  async getPeerFeedbackForEmployee(orgId: string, employeeId: string) {
    const feedbacks = await this.db
      .select({
        id: schema.feedbackRecords.id,
        fromUserId: schema.feedbackRecords.fromUserId,
        type: schema.feedbackRecords.type,
        category: schema.feedbackRecords.category,
        content: schema.feedbackRecords.content,
        isAnonymous: schema.feedbackRecords.isAnonymous,
        metadata: schema.feedbackRecords.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.feedbackRecords.createdAt,
      })
      .from(schema.feedbackRecords)
      .innerJoin(schema.users, eq(schema.feedbackRecords.fromUserId, schema.users.id))
      .where(
        and(
          eq(schema.feedbackRecords.orgId, orgId),
          eq(schema.feedbackRecords.toUserId, employeeId),
          eq(schema.feedbackRecords.isActive, true),
          eq(schema.feedbackRecords.type, 'peer'),
        ),
      )
      .orderBy(desc(schema.feedbackRecords.createdAt));

    return {
      data: feedbacks.map((f) => ({
        id: f.id,
        fromName: f.isAnonymous ? 'Anonymous' : `${f.firstName} ${f.lastName ?? ''}`.trim(),
        type: f.type,
        category: f.category,
        content: f.content,
        isAnonymous: f.isAnonymous,
        metadata: f.metadata,
        createdAt: f.createdAt?.toISOString?.() ?? f.createdAt,
      })),
      meta: { total: feedbacks.length },
    };
  }

  async getReviewHistory(orgId: string, employeeId: string) {
    const rows = await this.db
      .select({
        id: schema.reviewAssignments.id,
        cycleId: schema.reviewAssignments.cycleId,
        status: schema.reviewAssignments.status,
        selfRating: schema.reviewAssignments.selfRating,
        managerRating: schema.reviewAssignments.managerRating,
        finalRating: schema.reviewAssignments.finalRating,
        calibratedRating: schema.reviewAssignments.calibratedRating,
        achievements: schema.reviewAssignments.achievements,
        improvementAreas: schema.reviewAssignments.improvementAreas,
        cycleName: schema.reviewCycles.name,
        cycleType: schema.reviewCycles.type,
        cycleStartDate: schema.reviewCycles.startDate,
        cycleEndDate: schema.reviewCycles.endDate,
        createdAt: schema.reviewAssignments.createdAt,
      })
      .from(schema.reviewAssignments)
      .innerJoin(schema.reviewCycles, eq(schema.reviewAssignments.cycleId, schema.reviewCycles.id))
      .where(
        and(
          eq(schema.reviewAssignments.orgId, orgId),
          eq(schema.reviewAssignments.employeeId, employeeId),
          eq(schema.reviewAssignments.isActive, true),
        ),
      )
      .orderBy(desc(schema.reviewAssignments.createdAt));

    return {
      data: rows.map((r) => ({
        id: r.id,
        cycleId: r.cycleId,
        cycleName: r.cycleName,
        cycleType: r.cycleType,
        cycleStartDate: r.cycleStartDate,
        cycleEndDate: r.cycleEndDate,
        status: r.status,
        selfRating: r.selfRating ? Number(r.selfRating) : null,
        managerRating: r.managerRating ? Number(r.managerRating) : null,
        finalRating: r.finalRating ? Number(r.finalRating) : null,
        calibratedRating: r.calibratedRating ? Number(r.calibratedRating) : null,
        achievements: r.achievements,
        improvementAreas: r.improvementAreas,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
      meta: { total: rows.length },
    };
  }

  async giveContinuousFeedback(orgId: string, managerId: string, body: {
    toUserId: string;
    content: string;
    category?: string;
    type?: string;
    visibility?: string;
  }) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (!teamIds.includes(body.toUserId)) {
      throw new BadRequestException('You can only give continuous feedback to your direct reports');
    }

    const [feedback] = await this.db
      .insert(schema.feedbackRecords)
      .values({
        orgId,
        fromUserId: managerId,
        toUserId: body.toUserId,
        content: body.content,
        category: body.category ?? 'general',
        type: body.type ?? 'continuous',
        visibility: body.visibility ?? 'private',
        isAnonymous: false,
      })
      .returning();

    return { message: 'Feedback submitted successfully', feedback };
  }
}
