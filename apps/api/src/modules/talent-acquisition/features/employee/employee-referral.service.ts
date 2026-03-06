import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, or, ilike } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class EmployeeReferralService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── List Open Positions Eligible for Referral ─────────────────────────
  async getEligiblePositions(orgId: string) {
    const rows = await this.db
      .select({
        posting: schema.jobPostings,
        requisition: schema.jobRequisitions,
        departmentName: schema.departments.name,
      })
      .from(schema.jobPostings)
      .innerJoin(
        schema.jobRequisitions,
        eq(schema.jobPostings.requisitionId, schema.jobRequisitions.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.jobRequisitions.departmentId, schema.departments.id),
      )
      .where(
        and(
          eq(schema.jobPostings.orgId, orgId),
          eq(schema.jobPostings.status, 'published'),
          eq(schema.jobPostings.isActive, true),
        ),
      )
      .orderBy(desc(schema.jobPostings.publishedAt));

    return {
      data: rows.map((r) => ({
        id: r.posting.id,
        title: r.posting.title,
        description: r.posting.description,
        departmentId: r.requisition.departmentId,
        departmentName: r.departmentName,
        locationId: r.requisition.locationId,
        employmentType: r.requisition.employmentType,
        skills: r.posting.skills,
        experience: r.posting.experience,
        applicationDeadline: r.posting.applicationDeadline,
        publishedAt: r.posting.publishedAt?.toISOString() || null,
      })),
      total: rows.length,
    };
  }

  // ── Submit Referral ───────────────────────────────────────────────────
  async submitReferral(orgId: string, employeeId: string, data: Record<string, any>) {
    const {
      jobPostingId,
      candidateName,
      candidateEmail,
      candidatePhone,
      candidateResume,
      relationship,
      notes,
    } = data;

    if (!jobPostingId) {
      throw new BadRequestException('jobPostingId is required');
    }

    if (!candidateName || !candidateEmail) {
      throw new BadRequestException('candidateName and candidateEmail are required');
    }

    // Verify posting exists and is published
    const [posting] = await this.db
      .select()
      .from(schema.jobPostings)
      .where(
        and(
          eq(schema.jobPostings.id, jobPostingId),
          eq(schema.jobPostings.orgId, orgId),
          eq(schema.jobPostings.status, 'published'),
          eq(schema.jobPostings.isActive, true),
        ),
      )
      .limit(1);

    if (!posting) {
      throw new NotFoundException('Job posting not found or not open');
    }

    // Check for duplicate referral by same referrer for same email + posting
    const [existingReferral] = await this.db
      .select()
      .from(schema.referrals)
      .where(
        and(
          eq(schema.referrals.orgId, orgId),
          eq(schema.referrals.referrerId, employeeId),
          eq(schema.referrals.jobPostingId, jobPostingId),
          eq(schema.referrals.candidateEmail, candidateEmail),
          eq(schema.referrals.isActive, true),
        ),
      )
      .limit(1);

    if (existingReferral) {
      throw new BadRequestException('You have already referred this candidate for this position');
    }

    // Check if candidate already exists in system
    let candidateId: string | null = null;
    const [existingCandidate] = await this.db
      .select()
      .from(schema.candidates)
      .where(
        and(
          eq(schema.candidates.orgId, orgId),
          eq(schema.candidates.email, candidateEmail),
        ),
      )
      .limit(1);

    if (existingCandidate) {
      candidateId = existingCandidate.id;
    } else {
      // Create candidate record
      const nameParts = candidateName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || null;

      const [newCandidate] = await this.db
        .insert(schema.candidates)
        .values({
          orgId,
          firstName,
          lastName,
          email: candidateEmail,
          phone: candidatePhone || null,
          resumeUrl: candidateResume || null,
          source: 'referral',
          status: 'active',
        })
        .returning();

      candidateId = newCandidate.id;
    }

    // Create referral
    const [referral] = await this.db
      .insert(schema.referrals)
      .values({
        orgId,
        referrerId: employeeId,
        jobPostingId,
        candidateId,
        candidateName,
        candidateEmail,
        candidatePhone: candidatePhone || null,
        candidateResume: candidateResume || null,
        relationship: relationship || null,
        notes: notes || null,
        status: 'submitted',
        bonusStatus: 'not_eligible',
      })
      .returning();

    return this.toReferralDto(referral);
  }

  // ── List My Referrals ─────────────────────────────────────────────────
  async getMyReferrals(orgId: string, employeeId: string) {
    const rows = await this.db
      .select({
        referral: schema.referrals,
        postingTitle: schema.jobPostings.title,
        postingStatus: schema.jobPostings.status,
      })
      .from(schema.referrals)
      .leftJoin(
        schema.jobPostings,
        eq(schema.referrals.jobPostingId, schema.jobPostings.id),
      )
      .where(
        and(
          eq(schema.referrals.orgId, orgId),
          eq(schema.referrals.referrerId, employeeId),
          eq(schema.referrals.isActive, true),
        ),
      )
      .orderBy(desc(schema.referrals.createdAt));

    return {
      data: rows.map((r) => ({
        ...this.toReferralDto(r.referral),
        postingTitle: r.postingTitle,
        postingStatus: r.postingStatus,
      })),
      total: rows.length,
    };
  }

  // ── Get Referral Detail ───────────────────────────────────────────────
  async getReferralDetail(orgId: string, employeeId: string, referralId: string) {
    const [row] = await this.db
      .select({
        referral: schema.referrals,
        postingTitle: schema.jobPostings.title,
        postingStatus: schema.jobPostings.status,
        postingType: schema.jobPostings.postingType,
        applicationStatus: schema.applications.status,
        applicationStageId: schema.applications.currentStageId,
      })
      .from(schema.referrals)
      .leftJoin(
        schema.jobPostings,
        eq(schema.referrals.jobPostingId, schema.jobPostings.id),
      )
      .leftJoin(
        schema.applications,
        eq(schema.referrals.applicationId, schema.applications.id),
      )
      .where(
        and(
          eq(schema.referrals.id, referralId),
          eq(schema.referrals.orgId, orgId),
          eq(schema.referrals.referrerId, employeeId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Referral not found');
    }

    // Get pipeline stage name if application has a stage
    let stageName: string | null = null;
    if (row.applicationStageId) {
      const [stage] = await this.db
        .select({ name: schema.recruitmentPipelineStages.name })
        .from(schema.recruitmentPipelineStages)
        .where(eq(schema.recruitmentPipelineStages.id, row.applicationStageId))
        .limit(1);
      stageName = stage?.name || null;
    }

    return {
      ...this.toReferralDto(row.referral),
      postingTitle: row.postingTitle,
      postingStatus: row.postingStatus,
      postingType: row.postingType,
      applicationStatus: row.applicationStatus,
      currentStageName: stageName,
    };
  }

  // ── Bonus Status for My Referrals ─────────────────────────────────────
  async getBonusStatus(orgId: string, employeeId: string) {
    const rows = await this.db
      .select({
        referral: schema.referrals,
        postingTitle: schema.jobPostings.title,
      })
      .from(schema.referrals)
      .leftJoin(
        schema.jobPostings,
        eq(schema.referrals.jobPostingId, schema.jobPostings.id),
      )
      .where(
        and(
          eq(schema.referrals.orgId, orgId),
          eq(schema.referrals.referrerId, employeeId),
          eq(schema.referrals.isActive, true),
        ),
      )
      .orderBy(desc(schema.referrals.createdAt));

    const totalBonusEarned = rows
      .filter((r) => r.referral.bonusStatus === 'paid')
      .reduce((sum, r) => sum + Number(r.referral.bonusAmount || 0), 0);

    const pendingBonus = rows
      .filter((r) => r.referral.bonusStatus === 'eligible' || r.referral.bonusStatus === 'pending')
      .reduce((sum, r) => sum + Number(r.referral.bonusAmount || 0), 0);

    return {
      referrals: rows.map((r) => ({
        id: r.referral.id,
        candidateName: r.referral.candidateName,
        postingTitle: r.postingTitle,
        status: r.referral.status,
        bonusAmount: r.referral.bonusAmount ? Number(r.referral.bonusAmount) : null,
        bonusCurrency: r.referral.bonusCurrency,
        bonusStatus: r.referral.bonusStatus,
        bonusPaidAt: r.referral.bonusPaidAt?.toISOString() || null,
        createdAt: r.referral.createdAt.toISOString(),
      })),
      summary: {
        totalReferrals: rows.length,
        totalBonusEarned,
        pendingBonus,
        currency: rows[0]?.referral.bonusCurrency || 'INR',
      },
    };
  }

  // ── Referral Leaderboard ──────────────────────────────────────────────
  async getLeaderboard(orgId: string) {
    const rows = await this.db
      .select({
        referrerId: schema.referrals.referrerId,
        totalReferrals: sql<number>`count(*)::int`,
        hiredCount: sql<number>`count(*) filter (where ${schema.referrals.status} = 'hired')::int`,
        totalBonus: sql<string>`coalesce(sum(case when ${schema.referrals.bonusStatus} = 'paid' then ${schema.referrals.bonusAmount}::numeric else 0 end), 0)`,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.referrals)
      .innerJoin(schema.users, eq(schema.referrals.referrerId, schema.users.id))
      .where(
        and(
          eq(schema.referrals.orgId, orgId),
          eq(schema.referrals.isActive, true),
        ),
      )
      .groupBy(
        schema.referrals.referrerId,
        schema.users.firstName,
        schema.users.lastName,
      )
      .orderBy(sql`count(*) desc`)
      .limit(25);

    return {
      leaderboard: rows.map((r, index) => ({
        rank: index + 1,
        referrerId: r.referrerId,
        name: [r.firstName, r.lastName].filter(Boolean).join(' '),
        totalReferrals: r.totalReferrals,
        hiredCount: r.hiredCount,
        totalBonus: Number(r.totalBonus),
      })),
    };
  }

  // ── Full Referral History ─────────────────────────────────────────────
  async getReferralHistory(orgId: string, employeeId: string) {
    const rows = await this.db
      .select({
        referral: schema.referrals,
        postingTitle: schema.jobPostings.title,
        postingStatus: schema.jobPostings.status,
      })
      .from(schema.referrals)
      .leftJoin(
        schema.jobPostings,
        eq(schema.referrals.jobPostingId, schema.jobPostings.id),
      )
      .where(
        and(
          eq(schema.referrals.orgId, orgId),
          eq(schema.referrals.referrerId, employeeId),
        ),
      )
      .orderBy(desc(schema.referrals.createdAt));

    return {
      data: rows.map((r) => ({
        ...this.toReferralDto(r.referral),
        postingTitle: r.postingTitle,
        postingStatus: r.postingStatus,
      })),
      total: rows.length,
    };
  }

  // ── DTO Mapper ────────────────────────────────────────────────────────

  private toReferralDto(row: typeof schema.referrals.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      referrerId: row.referrerId,
      jobPostingId: row.jobPostingId,
      candidateId: row.candidateId,
      candidateName: row.candidateName,
      candidateEmail: row.candidateEmail,
      candidatePhone: row.candidatePhone,
      candidateResume: row.candidateResume,
      relationship: row.relationship,
      notes: row.notes,
      status: row.status,
      bonusAmount: row.bonusAmount ? Number(row.bonusAmount) : null,
      bonusCurrency: row.bonusCurrency,
      bonusStatus: row.bonusStatus,
      bonusPaidAt: row.bonusPaidAt?.toISOString() || null,
      applicationId: row.applicationId,
      metadata: row.metadata,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
