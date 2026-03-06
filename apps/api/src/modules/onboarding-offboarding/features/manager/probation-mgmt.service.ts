import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, inArray, lte, gte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ProbationMgmtService {
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

  async listProbationEmployees(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], total: 0 };

    const rows = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        probationEndDate: schema.employeeOnboardings.probationEndDate,
        probationStatus: schema.employeeOnboardings.probationStatus,
        probationReviews: schema.employeeOnboardings.probationReviews,
        startDate: schema.employeeOnboardings.startDate,
        progressPercentage: schema.employeeOnboardings.progressPercentage,
        status: schema.employeeOnboardings.status,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        createdAt: schema.employeeOnboardings.createdAt,
      })
      .from(schema.employeeOnboardings)
      .innerJoin(schema.users, eq(schema.employeeOnboardings.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.employeeOnboardings.orgId, orgId),
          inArray(schema.employeeOnboardings.employeeId, teamIds),
          eq(schema.employeeOnboardings.isActive, true),
          eq(schema.employeeOnboardings.probationStatus, 'pending'),
        ),
      )
      .orderBy(schema.employeeOnboardings.probationEndDate);

    return {
      data: rows.map((r) => ({
        onboardingId: r.id,
        employeeId: r.employeeId,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
        employeeEmail: r.email,
        probationEndDate: r.probationEndDate,
        probationStatus: r.probationStatus,
        reviewCount: Array.isArray(r.probationReviews) ? (r.probationReviews as any[]).length : 0,
        startDate: r.startDate,
        progressPercentage: r.progressPercentage ? Number(r.progressPercentage) : 0,
        onboardingStatus: r.status,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
      total: rows.length,
    };
  }

  async getProbationDetail(orgId: string, managerId: string, onboardingId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [row] = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        probationEndDate: schema.employeeOnboardings.probationEndDate,
        probationStatus: schema.employeeOnboardings.probationStatus,
        probationReviews: schema.employeeOnboardings.probationReviews,
        startDate: schema.employeeOnboardings.startDate,
        targetCompletionDate: schema.employeeOnboardings.targetCompletionDate,
        progressPercentage: schema.employeeOnboardings.progressPercentage,
        totalTasks: schema.employeeOnboardings.totalTasks,
        completedTasks: schema.employeeOnboardings.completedTasks,
        buddyId: schema.employeeOnboardings.buddyId,
        checkinSchedule: schema.employeeOnboardings.checkinSchedule,
        status: schema.employeeOnboardings.status,
        metadata: schema.employeeOnboardings.metadata,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        createdAt: schema.employeeOnboardings.createdAt,
        updatedAt: schema.employeeOnboardings.updatedAt,
      })
      .from(schema.employeeOnboardings)
      .innerJoin(schema.users, eq(schema.employeeOnboardings.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.employeeOnboardings.id, onboardingId),
          eq(schema.employeeOnboardings.orgId, orgId),
          eq(schema.employeeOnboardings.isActive, true),
        ),
      );

    if (!row || !teamIds.includes(row.employeeId)) {
      throw new NotFoundException('Probation record not found');
    }

    return {
      onboardingId: row.id,
      employeeId: row.employeeId,
      employeeName: `${row.firstName} ${row.lastName ?? ''}`.trim(),
      employeeEmail: row.email,
      probationEndDate: row.probationEndDate,
      probationStatus: row.probationStatus,
      probationReviews: row.probationReviews,
      startDate: row.startDate,
      targetCompletionDate: row.targetCompletionDate,
      progressPercentage: row.progressPercentage ? Number(row.progressPercentage) : 0,
      totalTasks: row.totalTasks,
      completedTasks: row.completedTasks,
      buddyId: row.buddyId,
      checkinSchedule: row.checkinSchedule,
      onboardingStatus: row.status,
      metadata: row.metadata,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    };
  }

  async submitReview(orgId: string, managerId: string, onboardingId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [onboarding] = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        probationReviews: schema.employeeOnboardings.probationReviews,
        probationStatus: schema.employeeOnboardings.probationStatus,
      })
      .from(schema.employeeOnboardings)
      .where(
        and(
          eq(schema.employeeOnboardings.id, onboardingId),
          eq(schema.employeeOnboardings.orgId, orgId),
        ),
      );

    if (!onboarding || !teamIds.includes(onboarding.employeeId)) {
      throw new NotFoundException('Probation record not found');
    }

    if (onboarding.probationStatus === 'confirmed' || onboarding.probationStatus === 'terminated') {
      throw new BadRequestException('Probation has already been finalized');
    }

    const existing = Array.isArray(onboarding.probationReviews) ? (onboarding.probationReviews as any[]) : [];
    const review = {
      reviewedBy: managerId,
      reviewDate: body.reviewDate ?? new Date().toISOString().split('T')[0],
      rating: body.rating ?? null,
      performanceNotes: body.performanceNotes ?? null,
      areasOfImprovement: body.areasOfImprovement ?? null,
      goalsAchieved: body.goalsAchieved ?? null,
      recommendation: body.recommendation ?? null,
      submittedAt: new Date().toISOString(),
    };

    const updated = [...existing, review];

    await this.db
      .update(schema.employeeOnboardings)
      .set({ probationReviews: updated, updatedAt: new Date() })
      .where(eq(schema.employeeOnboardings.id, onboardingId));

    return { message: 'Probation review submitted', onboardingId, review };
  }

  async confirmProbation(orgId: string, managerId: string, onboardingId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [onboarding] = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        probationStatus: schema.employeeOnboardings.probationStatus,
        metadata: schema.employeeOnboardings.metadata,
      })
      .from(schema.employeeOnboardings)
      .where(
        and(
          eq(schema.employeeOnboardings.id, onboardingId),
          eq(schema.employeeOnboardings.orgId, orgId),
        ),
      );

    if (!onboarding || !teamIds.includes(onboarding.employeeId)) {
      throw new NotFoundException('Probation record not found');
    }

    if (onboarding.probationStatus === 'confirmed') {
      throw new BadRequestException('Probation already confirmed');
    }

    const existingMeta = (onboarding.metadata as Record<string, any>) ?? {};
    const confirmationData = {
      confirmedBy: managerId,
      confirmedAt: new Date().toISOString(),
      notes: body.notes ?? null,
      effectiveDate: body.effectiveDate ?? new Date().toISOString().split('T')[0],
    };

    await this.db
      .update(schema.employeeOnboardings)
      .set({
        probationStatus: 'confirmed',
        metadata: { ...existingMeta, probationConfirmation: confirmationData },
        updatedAt: new Date(),
      })
      .where(eq(schema.employeeOnboardings.id, onboardingId));

    return { message: 'Probation confirmation recommendation submitted', onboardingId, confirmation: confirmationData };
  }

  async extendProbation(orgId: string, managerId: string, onboardingId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [onboarding] = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        probationEndDate: schema.employeeOnboardings.probationEndDate,
        probationStatus: schema.employeeOnboardings.probationStatus,
        metadata: schema.employeeOnboardings.metadata,
      })
      .from(schema.employeeOnboardings)
      .where(
        and(
          eq(schema.employeeOnboardings.id, onboardingId),
          eq(schema.employeeOnboardings.orgId, orgId),
        ),
      );

    if (!onboarding || !teamIds.includes(onboarding.employeeId)) {
      throw new NotFoundException('Probation record not found');
    }

    if (onboarding.probationStatus === 'confirmed') {
      throw new BadRequestException('Probation already confirmed, cannot extend');
    }

    if (!body.newEndDate) {
      throw new BadRequestException('newEndDate is required');
    }

    const existingMeta = (onboarding.metadata as Record<string, any>) ?? {};
    const extensions = existingMeta.probationExtensions ?? [];
    extensions.push({
      extendedBy: managerId,
      previousEndDate: onboarding.probationEndDate,
      newEndDate: body.newEndDate,
      reason: body.reason ?? null,
      extendedAt: new Date().toISOString(),
    });

    await this.db
      .update(schema.employeeOnboardings)
      .set({
        probationEndDate: body.newEndDate,
        probationStatus: 'extended',
        metadata: { ...existingMeta, probationExtensions: extensions },
        updatedAt: new Date(),
      })
      .where(eq(schema.employeeOnboardings.id, onboardingId));

    return { message: 'Probation extension recommendation submitted', onboardingId, newEndDate: body.newEndDate };
  }

  async getExpiringProbations(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], total: 0 };

    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = thirtyDaysLater.toISOString().split('T')[0];

    const rows = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        probationEndDate: schema.employeeOnboardings.probationEndDate,
        probationStatus: schema.employeeOnboardings.probationStatus,
        progressPercentage: schema.employeeOnboardings.progressPercentage,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.employeeOnboardings)
      .innerJoin(schema.users, eq(schema.employeeOnboardings.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.employeeOnboardings.orgId, orgId),
          inArray(schema.employeeOnboardings.employeeId, teamIds),
          eq(schema.employeeOnboardings.isActive, true),
          eq(schema.employeeOnboardings.probationStatus, 'pending'),
          gte(schema.employeeOnboardings.probationEndDate, todayStr),
          lte(schema.employeeOnboardings.probationEndDate, futureStr),
        ),
      )
      .orderBy(schema.employeeOnboardings.probationEndDate);

    return {
      data: rows.map((r) => ({
        onboardingId: r.id,
        employeeId: r.employeeId,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
        employeeEmail: r.email,
        probationEndDate: r.probationEndDate,
        probationStatus: r.probationStatus,
        progressPercentage: r.progressPercentage ? Number(r.progressPercentage) : 0,
        daysRemaining: r.probationEndDate
          ? Math.ceil((new Date(r.probationEndDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
      total: rows.length,
    };
  }
}
