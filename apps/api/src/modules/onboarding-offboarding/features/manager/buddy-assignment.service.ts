import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, inArray, sql, isNotNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class BuddyAssignmentService {
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

  async listBuddyAssignments(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], total: 0 };

    const rows = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        buddyId: schema.employeeOnboardings.buddyId,
        status: schema.employeeOnboardings.status,
        startDate: schema.employeeOnboardings.startDate,
        buddyFeedback: schema.employeeOnboardings.buddyFeedback,
        progressPercentage: schema.employeeOnboardings.progressPercentage,
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
        ),
      )
      .orderBy(desc(schema.employeeOnboardings.createdAt));

    // Fetch buddy names
    const buddyIds = rows.map((r) => r.buddyId).filter(Boolean) as string[];
    let buddyNameMap = new Map<string, string>();

    if (buddyIds.length > 0) {
      const buddies = await this.db
        .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName })
        .from(schema.users)
        .where(inArray(schema.users.id, buddyIds));

      for (const b of buddies) {
        buddyNameMap.set(b.id, `${b.firstName} ${b.lastName ?? ''}`.trim());
      }
    }

    return {
      data: rows.map((r) => ({
        onboardingId: r.id,
        employeeId: r.employeeId,
        employeeName: `${r.firstName} ${r.lastName ?? ''}`.trim(),
        employeeEmail: r.email,
        buddyId: r.buddyId,
        buddyName: r.buddyId ? (buddyNameMap.get(r.buddyId) ?? 'Unknown') : null,
        status: r.status,
        startDate: r.startDate,
        progressPercentage: r.progressPercentage ? Number(r.progressPercentage) : 0,
        feedbackCount: Array.isArray(r.buddyFeedback) ? (r.buddyFeedback as any[]).length : 0,
        createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      })),
      total: rows.length,
    };
  }

  async assignBuddy(orgId: string, managerId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    if (!body.onboardingId) throw new BadRequestException('onboardingId is required');
    if (!body.buddyId) throw new BadRequestException('buddyId is required');

    const [onboarding] = await this.db
      .select({ id: schema.employeeOnboardings.id, employeeId: schema.employeeOnboardings.employeeId })
      .from(schema.employeeOnboardings)
      .where(
        and(
          eq(schema.employeeOnboardings.id, body.onboardingId),
          eq(schema.employeeOnboardings.orgId, orgId),
          eq(schema.employeeOnboardings.isActive, true),
        ),
      );

    if (!onboarding || !teamIds.includes(onboarding.employeeId)) {
      throw new NotFoundException('Onboarding record not found');
    }

    // Verify buddy exists in org
    const [buddy] = await this.db
      .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName })
      .from(schema.users)
      .where(and(eq(schema.users.id, body.buddyId), eq(schema.users.orgId, orgId), eq(schema.users.isActive, true)));

    if (!buddy) throw new NotFoundException('Buddy user not found in organization');

    await this.db
      .update(schema.employeeOnboardings)
      .set({ buddyId: body.buddyId, updatedAt: new Date() })
      .where(eq(schema.employeeOnboardings.id, body.onboardingId));

    return {
      message: 'Buddy assigned successfully',
      onboardingId: body.onboardingId,
      buddyId: body.buddyId,
      buddyName: `${buddy.firstName} ${buddy.lastName ?? ''}`.trim(),
    };
  }

  async reassignBuddy(orgId: string, managerId: string, onboardingId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    if (!body.buddyId) throw new BadRequestException('buddyId is required');

    const [onboarding] = await this.db
      .select({ id: schema.employeeOnboardings.id, employeeId: schema.employeeOnboardings.employeeId, buddyId: schema.employeeOnboardings.buddyId })
      .from(schema.employeeOnboardings)
      .where(
        and(
          eq(schema.employeeOnboardings.id, onboardingId),
          eq(schema.employeeOnboardings.orgId, orgId),
          eq(schema.employeeOnboardings.isActive, true),
        ),
      );

    if (!onboarding || !teamIds.includes(onboarding.employeeId)) {
      throw new NotFoundException('Onboarding record not found');
    }

    // Verify new buddy exists
    const [buddy] = await this.db
      .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName })
      .from(schema.users)
      .where(and(eq(schema.users.id, body.buddyId), eq(schema.users.orgId, orgId), eq(schema.users.isActive, true)));

    if (!buddy) throw new NotFoundException('Buddy user not found in organization');

    await this.db
      .update(schema.employeeOnboardings)
      .set({ buddyId: body.buddyId, updatedAt: new Date() })
      .where(eq(schema.employeeOnboardings.id, onboardingId));

    return {
      message: 'Buddy reassigned successfully',
      onboardingId,
      previousBuddyId: onboarding.buddyId,
      newBuddyId: body.buddyId,
      buddyName: `${buddy.firstName} ${buddy.lastName ?? ''}`.trim(),
    };
  }

  async getBuddyInteractions(orgId: string, managerId: string, onboardingId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [onboarding] = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        buddyId: schema.employeeOnboardings.buddyId,
        buddyFeedback: schema.employeeOnboardings.buddyFeedback,
        checkinSchedule: schema.employeeOnboardings.checkinSchedule,
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
      throw new NotFoundException('Onboarding record not found');
    }

    const meta = (onboarding.metadata as Record<string, any>) ?? {};

    return {
      onboardingId,
      buddyId: onboarding.buddyId,
      interactions: meta.buddyInteractions ?? [],
      checkinSchedule: onboarding.checkinSchedule,
      feedbackEntries: onboarding.buddyFeedback,
    };
  }

  async submitBuddyFeedback(orgId: string, managerId: string, onboardingId: string, body: Record<string, any>) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);

    const [onboarding] = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        employeeId: schema.employeeOnboardings.employeeId,
        buddyFeedback: schema.employeeOnboardings.buddyFeedback,
      })
      .from(schema.employeeOnboardings)
      .where(
        and(
          eq(schema.employeeOnboardings.id, onboardingId),
          eq(schema.employeeOnboardings.orgId, orgId),
        ),
      );

    if (!onboarding || !teamIds.includes(onboarding.employeeId)) {
      throw new NotFoundException('Onboarding record not found');
    }

    const existing = Array.isArray(onboarding.buddyFeedback) ? (onboarding.buddyFeedback as any[]) : [];
    const entry = {
      submittedBy: managerId,
      rating: body.rating ?? null,
      comments: body.comments ?? null,
      effectiveness: body.effectiveness ?? null,
      submittedAt: new Date().toISOString(),
    };
    const updated = [...existing, entry];

    await this.db
      .update(schema.employeeOnboardings)
      .set({ buddyFeedback: updated, updatedAt: new Date() })
      .where(eq(schema.employeeOnboardings.id, onboardingId));

    return { message: 'Buddy feedback submitted', onboardingId, feedback: entry };
  }

  async getEffectivenessMetrics(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { withBuddy: { count: 0, avgProgress: 0 }, withoutBuddy: { count: 0, avgProgress: 0 } };

    const onboardings = await this.db
      .select({
        id: schema.employeeOnboardings.id,
        buddyId: schema.employeeOnboardings.buddyId,
        progressPercentage: schema.employeeOnboardings.progressPercentage,
        status: schema.employeeOnboardings.status,
        startDate: schema.employeeOnboardings.startDate,
        completedAt: schema.employeeOnboardings.completedAt,
      })
      .from(schema.employeeOnboardings)
      .where(
        and(
          eq(schema.employeeOnboardings.orgId, orgId),
          inArray(schema.employeeOnboardings.employeeId, teamIds),
          eq(schema.employeeOnboardings.isActive, true),
        ),
      );

    let withBuddyProgress: number[] = [];
    let withoutBuddyProgress: number[] = [];
    let withBuddyDays: number[] = [];
    let withoutBuddyDays: number[] = [];

    for (const o of onboardings) {
      const progress = o.progressPercentage ? Number(o.progressPercentage) : 0;
      if (o.buddyId) {
        withBuddyProgress.push(progress);
        if (o.completedAt && o.startDate) {
          const days = Math.ceil((new Date(o.completedAt).getTime() - new Date(o.startDate).getTime()) / (1000 * 60 * 60 * 24));
          withBuddyDays.push(days);
        }
      } else {
        withoutBuddyProgress.push(progress);
        if (o.completedAt && o.startDate) {
          const days = Math.ceil((new Date(o.completedAt).getTime() - new Date(o.startDate).getTime()) / (1000 * 60 * 60 * 24));
          withoutBuddyDays.push(days);
        }
      }
    }

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100 : 0;

    return {
      withBuddy: {
        count: withBuddyProgress.length,
        avgProgress: avg(withBuddyProgress),
        avgCompletionDays: avg(withBuddyDays),
      },
      withoutBuddy: {
        count: withoutBuddyProgress.length,
        avgProgress: avg(withoutBuddyProgress),
        avgCompletionDays: avg(withoutBuddyDays),
      },
      totalOnboardings: onboardings.length,
    };
  }
}
