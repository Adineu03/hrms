import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ReferralMgmtService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private toDto(referral: Record<string, any>) {
    return {
      ...referral,
      bonusAmount: referral.bonusAmount ? Number(referral.bonusAmount) : null,
      createdAt: referral.createdAt?.toISOString?.() ?? referral.createdAt,
      updatedAt: referral.updatedAt?.toISOString?.() ?? referral.updatedAt,
      bonusPaidAt: referral.bonusPaidAt?.toISOString?.() ?? referral.bonusPaidAt ?? null,
    };
  }

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const team = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
    return team.map((t) => t.userId);
  }

  async listMyReferrals(orgId: string, managerId: string) {
    const referrals = await this.db
      .select({
        id: schema.referrals.id,
        referrerId: schema.referrals.referrerId,
        jobPostingId: schema.referrals.jobPostingId,
        candidateId: schema.referrals.candidateId,
        candidateName: schema.referrals.candidateName,
        candidateEmail: schema.referrals.candidateEmail,
        candidatePhone: schema.referrals.candidatePhone,
        candidateResume: schema.referrals.candidateResume,
        relationship: schema.referrals.relationship,
        notes: schema.referrals.notes,
        status: schema.referrals.status,
        bonusAmount: schema.referrals.bonusAmount,
        bonusCurrency: schema.referrals.bonusCurrency,
        bonusStatus: schema.referrals.bonusStatus,
        bonusPaidAt: schema.referrals.bonusPaidAt,
        applicationId: schema.referrals.applicationId,
        metadata: schema.referrals.metadata,
        jobTitle: schema.jobPostings.title,
        createdAt: schema.referrals.createdAt,
        updatedAt: schema.referrals.updatedAt,
      })
      .from(schema.referrals)
      .innerJoin(schema.jobPostings, eq(schema.referrals.jobPostingId, schema.jobPostings.id))
      .where(
        and(
          eq(schema.referrals.orgId, orgId),
          eq(schema.referrals.referrerId, managerId),
          eq(schema.referrals.isActive, true),
        ),
      )
      .orderBy(desc(schema.referrals.createdAt));

    return {
      data: referrals.map((r) => this.toDto(r)),
      total: referrals.length,
    };
  }

  async submitReferral(orgId: string, managerId: string, body: Record<string, any>) {
    if (!body.jobPostingId) {
      throw new BadRequestException('jobPostingId is required');
    }
    if (!body.candidateName || !body.candidateEmail) {
      throw new BadRequestException('candidateName and candidateEmail are required');
    }

    // Verify the job posting exists and is active
    const [posting] = await this.db
      .select({ id: schema.jobPostings.id, status: schema.jobPostings.status })
      .from(schema.jobPostings)
      .where(
        and(
          eq(schema.jobPostings.id, body.jobPostingId),
          eq(schema.jobPostings.orgId, orgId),
          eq(schema.jobPostings.isActive, true),
        ),
      );

    if (!posting) {
      throw new NotFoundException('Job posting not found');
    }

    if (posting.status !== 'published') {
      throw new BadRequestException('Job posting is not currently accepting applications');
    }

    const [referral] = await this.db
      .insert(schema.referrals)
      .values({
        orgId,
        referrerId: managerId,
        jobPostingId: body.jobPostingId,
        candidateName: body.candidateName,
        candidateEmail: body.candidateEmail,
        candidatePhone: body.candidatePhone ?? null,
        candidateResume: body.candidateResume ?? null,
        relationship: body.relationship ?? null,
        notes: body.notes ?? null,
        status: 'submitted',
        bonusStatus: 'not_eligible',
        metadata: body.metadata ?? {},
      })
      .returning();

    return this.toDto(referral);
  }

  async getReferralDetail(orgId: string, managerId: string, referralId: string) {
    const [referral] = await this.db
      .select({
        id: schema.referrals.id,
        referrerId: schema.referrals.referrerId,
        jobPostingId: schema.referrals.jobPostingId,
        candidateId: schema.referrals.candidateId,
        candidateName: schema.referrals.candidateName,
        candidateEmail: schema.referrals.candidateEmail,
        candidatePhone: schema.referrals.candidatePhone,
        candidateResume: schema.referrals.candidateResume,
        relationship: schema.referrals.relationship,
        notes: schema.referrals.notes,
        status: schema.referrals.status,
        bonusAmount: schema.referrals.bonusAmount,
        bonusCurrency: schema.referrals.bonusCurrency,
        bonusStatus: schema.referrals.bonusStatus,
        bonusPaidAt: schema.referrals.bonusPaidAt,
        applicationId: schema.referrals.applicationId,
        metadata: schema.referrals.metadata,
        jobTitle: schema.jobPostings.title,
        jobStatus: schema.jobPostings.status,
        createdAt: schema.referrals.createdAt,
        updatedAt: schema.referrals.updatedAt,
      })
      .from(schema.referrals)
      .innerJoin(schema.jobPostings, eq(schema.referrals.jobPostingId, schema.jobPostings.id))
      .where(
        and(
          eq(schema.referrals.id, referralId),
          eq(schema.referrals.orgId, orgId),
          eq(schema.referrals.referrerId, managerId),
        ),
      );

    if (!referral) {
      throw new NotFoundException('Referral not found or access denied');
    }

    // If there's a linked application, get pipeline status
    let pipelineStatus = null;
    if (referral.applicationId) {
      const [application] = await this.db
        .select({
          id: schema.applications.id,
          status: schema.applications.status,
          overallScore: schema.applications.overallScore,
          currentStageId: schema.applications.currentStageId,
          stageName: schema.recruitmentPipelineStages.name,
          stageType: schema.recruitmentPipelineStages.stageType,
        })
        .from(schema.applications)
        .leftJoin(
          schema.recruitmentPipelineStages,
          eq(schema.applications.currentStageId, schema.recruitmentPipelineStages.id),
        )
        .where(eq(schema.applications.id, referral.applicationId));

      if (application) {
        pipelineStatus = {
          applicationId: application.id,
          applicationStatus: application.status,
          overallScore: application.overallScore ? Number(application.overallScore) : null,
          currentStage: application.stageName ?? null,
          currentStageType: application.stageType ?? null,
        };
      }
    }

    return {
      ...this.toDto(referral),
      pipelineStatus,
    };
  }

  async getTeamReferrals(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);

    if (teamMemberIds.length === 0) {
      return { teamMembers: [], summary: { totalReferrals: 0, totalTeamMembers: 0 } };
    }

    // Get team member names
    const teamMembers = await this.db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(inArray(schema.users.id, teamMemberIds));

    const nameMap = new Map<string, string>();
    for (const member of teamMembers) {
      nameMap.set(member.id, `${member.firstName} ${member.lastName ?? ''}`.trim());
    }

    // Get referrals by team members
    const referrals = await this.db
      .select({
        id: schema.referrals.id,
        referrerId: schema.referrals.referrerId,
        candidateName: schema.referrals.candidateName,
        candidateEmail: schema.referrals.candidateEmail,
        status: schema.referrals.status,
        bonusStatus: schema.referrals.bonusStatus,
        bonusAmount: schema.referrals.bonusAmount,
        jobTitle: schema.jobPostings.title,
        createdAt: schema.referrals.createdAt,
      })
      .from(schema.referrals)
      .innerJoin(schema.jobPostings, eq(schema.referrals.jobPostingId, schema.jobPostings.id))
      .where(
        and(
          eq(schema.referrals.orgId, orgId),
          inArray(schema.referrals.referrerId, teamMemberIds),
          eq(schema.referrals.isActive, true),
        ),
      )
      .orderBy(desc(schema.referrals.createdAt));

    // Group by team member
    const memberReferralMap = new Map<string, any[]>();
    for (const ref of referrals) {
      if (!memberReferralMap.has(ref.referrerId)) {
        memberReferralMap.set(ref.referrerId, []);
      }
      memberReferralMap.get(ref.referrerId)!.push({
        id: ref.id,
        candidateName: ref.candidateName,
        candidateEmail: ref.candidateEmail,
        jobTitle: ref.jobTitle,
        status: ref.status,
        bonusStatus: ref.bonusStatus,
        bonusAmount: ref.bonusAmount ? Number(ref.bonusAmount) : null,
        createdAt: ref.createdAt?.toISOString?.() ?? ref.createdAt,
      });
    }

    const teamMemberData = teamMembers.map((member) => ({
      employeeId: member.id,
      employeeName: nameMap.get(member.id) ?? 'Unknown',
      email: member.email,
      referralCount: memberReferralMap.get(member.id)?.length ?? 0,
      referrals: memberReferralMap.get(member.id) ?? [],
    }));

    return {
      teamMembers: teamMemberData,
      summary: {
        totalReferrals: referrals.length,
        totalTeamMembers: teamMembers.length,
        membersWithReferrals: teamMemberData.filter((m) => m.referralCount > 0).length,
        statusBreakdown: referrals.reduce(
          (acc, r) => {
            acc[r.status] = (acc[r.status] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
    };
  }

  async getReferralBonusEligibility(orgId: string, managerId: string) {
    // Get manager's own referrals with bonus info
    const referrals = await this.db
      .select({
        id: schema.referrals.id,
        candidateName: schema.referrals.candidateName,
        candidateEmail: schema.referrals.candidateEmail,
        status: schema.referrals.status,
        bonusAmount: schema.referrals.bonusAmount,
        bonusCurrency: schema.referrals.bonusCurrency,
        bonusStatus: schema.referrals.bonusStatus,
        bonusPaidAt: schema.referrals.bonusPaidAt,
        applicationId: schema.referrals.applicationId,
        jobTitle: schema.jobPostings.title,
        createdAt: schema.referrals.createdAt,
      })
      .from(schema.referrals)
      .innerJoin(schema.jobPostings, eq(schema.referrals.jobPostingId, schema.jobPostings.id))
      .where(
        and(
          eq(schema.referrals.orgId, orgId),
          eq(schema.referrals.referrerId, managerId),
          eq(schema.referrals.isActive, true),
        ),
      )
      .orderBy(desc(schema.referrals.createdAt));

    let totalBonusEarned = 0;
    let totalBonusPending = 0;
    let totalBonusPaid = 0;

    const bonusTracking = referrals.map((ref) => {
      const amount = ref.bonusAmount ? Number(ref.bonusAmount) : 0;

      if (ref.bonusStatus === 'paid') {
        totalBonusPaid += amount;
        totalBonusEarned += amount;
      } else if (ref.bonusStatus === 'eligible' || ref.bonusStatus === 'approved') {
        totalBonusPending += amount;
        totalBonusEarned += amount;
      }

      return {
        referralId: ref.id,
        candidateName: ref.candidateName,
        candidateEmail: ref.candidateEmail,
        jobTitle: ref.jobTitle,
        referralStatus: ref.status,
        bonusAmount: amount,
        bonusCurrency: ref.bonusCurrency,
        bonusStatus: ref.bonusStatus,
        bonusPaidAt: ref.bonusPaidAt?.toISOString?.() ?? ref.bonusPaidAt ?? null,
        createdAt: ref.createdAt?.toISOString?.() ?? ref.createdAt,
      };
    });

    return {
      summary: {
        totalReferrals: referrals.length,
        totalBonusEarned: Math.round(totalBonusEarned * 100) / 100,
        totalBonusPaid: Math.round(totalBonusPaid * 100) / 100,
        totalBonusPending: Math.round(totalBonusPending * 100) / 100,
        bonusStatusBreakdown: referrals.reduce(
          (acc, r) => {
            const status = r.bonusStatus ?? 'not_eligible';
            acc[status] = (acc[status] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      referrals: bonusTracking,
    };
  }
}
