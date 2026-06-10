import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class RecruitmentReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getOverview(orgId: string) {
    // Total requisitions by status
    const requisitionStats = await this.db
      .select({
        status: schema.jobRequisitions.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.orgId, orgId),
          eq(schema.jobRequisitions.isActive, true),
        ),
      )
      .groupBy(schema.jobRequisitions.status);

    const totalRequisitions = requisitionStats.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
    const openRequisitions = requisitionStats
      .filter((r) => ['open', 'approved', 'pending_approval', 'draft'].includes(r.status))
      .reduce((sum, r) => sum + (Number(r.count) || 0), 0);

    // Filled positions = headcount actually filled across requisitions
    const [filledStats] = await this.db
      .select({ filled: sql<number>`coalesce(sum(${schema.jobRequisitions.filledCount}), 0)::int` })
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.orgId, orgId),
          eq(schema.jobRequisitions.isActive, true),
        ),
      );
    const filledPositions = Number(filledStats?.filled) || 0;

    // Total applications
    const [appStats] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.applications)
      .where(eq(schema.applications.orgId, orgId));

    // Total candidates
    const [candidateStats] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.candidates)
      .where(
        and(
          eq(schema.candidates.orgId, orgId),
          eq(schema.candidates.isActive, true),
        ),
      );

    // Offers by status
    const offerStats = await this.db
      .select({
        status: schema.offerLetters.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.offerLetters)
      .where(eq(schema.offerLetters.orgId, orgId))
      .groupBy(schema.offerLetters.status);
    const offersAccepted = offerStats
      .filter((o) => o.status === 'accepted')
      .reduce((sum, o) => sum + (Number(o.count) || 0), 0);

    // Average time-to-hire: application date -> offer acceptance, clamped at 0
    // so out-of-order seed timestamps can never produce a negative average.
    const avgRows = await this.db.execute(sql`
      SELECT COALESCE(
        AVG(GREATEST(EXTRACT(EPOCH FROM (ol.accepted_at - a.applied_at)) / 86400, 0))::int,
        0
      ) AS avg_days
      FROM offer_letters ol
      JOIN applications a ON ol.application_id = a.id
      WHERE ol.org_id = ${orgId}
        AND ol.accepted_at IS NOT NULL
    `);
    const avgTimeToHire = Number((avgRows as any[])[0]?.avg_days) || 0;

    return {
      totalRequisitions,
      openPositions: openRequisitions,
      filledPositions,
      totalCandidates: Number(candidateStats?.count) || 0,
      totalApplications: Number(appStats?.count) || 0,
      offersAccepted,
      avgTimeToHire,
      // Legacy keys kept for compatibility
      openRequisitions,
      filledRequisitions: filledPositions,
      requisitionsByStatus: requisitionStats,
      offersByStatus: offerStats,
      averageTimeToHireDays: avgTimeToHire,
    };
  }

  async getTimeToHire(orgId: string, filters: { groupBy?: string }) {
    const groupByField = filters.groupBy ?? 'role';

    if (groupByField === 'source') {
      const rows = await this.db.execute(sql`
        SELECT
          a.source AS role,
          '—' AS department,
          COUNT(ol.id)::int AS hires,
          COALESCE(AVG(GREATEST(EXTRACT(EPOCH FROM (ol.accepted_at - a.applied_at)) / 86400, 0))::int, 0) AS avg_days,
          COALESCE(MIN(GREATEST(EXTRACT(EPOCH FROM (ol.accepted_at - a.applied_at)) / 86400, 0))::int, 0) AS min_days,
          COALESCE(MAX(GREATEST(EXTRACT(EPOCH FROM (ol.accepted_at - a.applied_at)) / 86400, 0))::int, 0) AS max_days
        FROM offer_letters ol
        JOIN applications a ON ol.application_id = a.id
        WHERE ol.org_id = ${orgId} AND ol.accepted_at IS NOT NULL
        GROUP BY a.source
        ORDER BY avg_days DESC
      `);

      return { groupBy: 'source', data: this.toTimeToHireDtos(rows as any[]) };
    }

    // Default: per filled role (requisition title × department)
    const rows = await this.db.execute(sql`
      SELECT
        jr.title AS role,
        COALESCE(d.name, 'General') AS department,
        COUNT(ol.id)::int AS hires,
        COALESCE(AVG(GREATEST(EXTRACT(EPOCH FROM (ol.accepted_at - a.applied_at)) / 86400, 0))::int, 0) AS avg_days,
        COALESCE(MIN(GREATEST(EXTRACT(EPOCH FROM (ol.accepted_at - a.applied_at)) / 86400, 0))::int, 0) AS min_days,
        COALESCE(MAX(GREATEST(EXTRACT(EPOCH FROM (ol.accepted_at - a.applied_at)) / 86400, 0))::int, 0) AS max_days
      FROM offer_letters ol
      JOIN applications a ON ol.application_id = a.id
      JOIN job_requisitions jr ON ol.requisition_id = jr.id
      LEFT JOIN departments d ON jr.department_id = d.id
      WHERE ol.org_id = ${orgId} AND ol.accepted_at IS NOT NULL
      GROUP BY jr.title, d.name
      ORDER BY avg_days DESC
    `);

    return { groupBy: 'role', data: this.toTimeToHireDtos(rows as any[]) };
  }

  private toTimeToHireDtos(rows: any[]) {
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      role: r.role ?? 'Unknown',
      department: r.department ?? 'General',
      averageDays: Number(r.avg_days) || 0,
      hires: Number(r.hires) || 0,
      minDays: Number(r.min_days) || 0,
      maxDays: Number(r.max_days) || 0,
    }));
  }

  async getSourceEffectiveness(orgId: string) {
    // Per source: applicants, shortlisted (progressed past screening or
    // interviewed), hired (hired status or accepted offer)
    const rows = await this.db.execute(sql`
      SELECT
        COALESCE(a.source, 'direct') AS source,
        COUNT(DISTINCT a.id)::int AS applicants,
        COUNT(DISTINCT CASE
          WHEN a.status IN ('shortlisted', 'interviewing', 'offered', 'hired') OR i.id IS NOT NULL
          THEN a.id END)::int AS shortlisted,
        COUNT(DISTINCT CASE
          WHEN a.status = 'hired' OR ol.id IS NOT NULL
          THEN a.id END)::int AS hired
      FROM applications a
      LEFT JOIN interviews i ON i.application_id = a.id
      LEFT JOIN offer_letters ol ON ol.application_id = a.id AND ol.status = 'accepted'
      WHERE a.org_id = ${orgId}
      GROUP BY COALESCE(a.source, 'direct')
      ORDER BY applicants DESC
    `);

    const data = (rows as any[]).map((r) => {
      const applicants = Number(r.applicants) || 0;
      const hired = Number(r.hired) || 0;
      return {
        source: r.source ?? 'direct',
        applicants,
        shortlisted: Number(r.shortlisted) || 0,
        hired,
        conversionRate: applicants > 0 ? Number(((hired / applicants) * 100).toFixed(2)) : 0,
      };
    });

    return { data };
  }

  async getPipelineFunnel(orgId: string, filters: { requisitionId?: string }) {
    // Build a monotonic funnel from application statuses + interviews + offers:
    // each application is counted at every stage up to the furthest it reached.
    const appConditions = [eq(schema.applications.orgId, orgId)];
    if (filters.requisitionId) {
      appConditions.push(eq(schema.applications.requisitionId, filters.requisitionId));
    }

    const apps = await this.db
      .select({ id: schema.applications.id, status: schema.applications.status })
      .from(schema.applications)
      .where(and(...appConditions));

    const interviewRows = await this.db
      .select({ applicationId: schema.interviews.applicationId })
      .from(schema.interviews)
      .where(eq(schema.interviews.orgId, orgId));
    const interviewedAppIds = new Set(interviewRows.map((r) => r.applicationId));

    const offerRows = await this.db
      .select({
        applicationId: schema.offerLetters.applicationId,
        status: schema.offerLetters.status,
      })
      .from(schema.offerLetters)
      .where(eq(schema.offerLetters.orgId, orgId));
    const offeredAppIds = new Set(offerRows.map((r) => r.applicationId));
    const acceptedOfferAppIds = new Set(
      offerRows.filter((r) => r.status === 'accepted').map((r) => r.applicationId),
    );

    const stageOfApp = (app: { id: string; status: string }): number => {
      if (app.status === 'hired' || acceptedOfferAppIds.has(app.id)) return 5;
      if (app.status === 'offered' || offeredAppIds.has(app.id)) return 4;
      if (
        app.status === 'interviewing' ||
        app.status === 'shortlisted' ||
        interviewedAppIds.has(app.id)
      ) {
        return 3;
      }
      if (app.status !== 'new') return 2;
      return 1;
    };

    const stageNames = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];
    const reached = apps.map((a) => stageOfApp(a));
    const funnel = stageNames.map((stageName, idx) => {
      const level = idx + 1;
      const count = reached.filter((r) => r >= level).length;
      return { stageName, count };
    });

    const data = funnel.map((stage, index) => {
      const prevCount = index > 0 ? funnel[index - 1].count : stage.count;
      const dropOffRate =
        index > 0 && prevCount > 0
          ? Number(((1 - stage.count / prevCount) * 100).toFixed(2))
          : 0;
      return {
        stageName: stage.stageName,
        count: stage.count,
        candidateCount: stage.count,
        dropOffRate: Math.max(0, dropOffRate),
      };
    });

    // Overall status counts (secondary payload)
    const statusCounts = await this.db
      .select({
        status: schema.applications.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.applications)
      .where(eq(schema.applications.orgId, orgId))
      .groupBy(schema.applications.status);

    return {
      data,
      funnel: data,
      statusCounts,
    };
  }

  async getRecruiterProductivity(orgId: string) {
    // Metrics per recruiter (posting creator as proxy for recruiter)
    const rows = await this.db.execute(sql`
      SELECT
        u.id AS recruiter_id,
        u.first_name || ' ' || COALESCE(u.last_name, '') AS recruiter_name,
        COUNT(DISTINCT jp.id)::int AS postings_created,
        COUNT(DISTINCT a.id)::int AS applications_received,
        COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN a.id END)::int AS interviews_scheduled,
        COUNT(DISTINCT CASE WHEN a.status = 'hired' THEN a.id END)::int AS hires_made,
        COUNT(DISTINCT ol.id)::int AS offers_extended
      FROM users u
      LEFT JOIN job_postings jp ON u.id = jp.created_by AND jp.org_id = ${orgId}
      LEFT JOIN applications a ON jp.id = a.job_posting_id
      LEFT JOIN interviews i ON a.id = i.application_id
      LEFT JOIN offer_letters ol ON a.id = ol.application_id
      WHERE u.org_id = ${orgId}
        AND u.role IN ('super_admin', 'admin')
        AND jp.id IS NOT NULL
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY hires_made DESC
    `);

    return { data: rows };
  }

  /**
   * Deterministic per-channel cost-per-hire estimates (INR). These are fixed
   * model assumptions, not invoiced spend — labeled as estimates in the
   * response so the UI stays honest about their provenance.
   */
  private static readonly SOURCE_COST_PER_HIRE: Record<string, number> = {
    linkedin: 260000,
    job_board: 180000,
    agency: 480000,
    referral: 90000,
    internal: 40000,
    career_page: 65000,
    direct: 75000,
  };

  async getHiringCost(orgId: string) {
    // Applicants + hires per source (hired = hired status or accepted offer)
    const rows = await this.db.execute(sql`
      SELECT
        COALESCE(a.source, 'direct') AS source,
        COUNT(DISTINCT a.id)::int AS applicants,
        COUNT(DISTINCT CASE
          WHEN a.status = 'hired' OR ol.id IS NOT NULL
          THEN a.id END)::int AS hires
      FROM applications a
      LEFT JOIN offer_letters ol ON ol.application_id = a.id AND ol.status = 'accepted'
      WHERE a.org_id = ${orgId}
      GROUP BY COALESCE(a.source, 'direct')
      ORDER BY hires DESC, applicants DESC
    `);

    const data = (rows as any[]).map((r) => {
      const source = r.source ?? 'direct';
      const hireCount = Number(r.hires) || 0;
      const costPerHire =
        RecruitmentReportsService.SOURCE_COST_PER_HIRE[source] ??
        RecruitmentReportsService.SOURCE_COST_PER_HIRE.direct;
      return {
        source,
        applicants: Number(r.applicants) || 0,
        hireCount,
        costPerHire,
        totalCost: costPerHire * hireCount,
      };
    });

    const totalHires = data.reduce((sum, d) => sum + d.hireCount, 0);
    const totalCost = data.reduce((sum, d) => sum + d.totalCost, 0);

    return {
      data,
      costModel: 'estimated', // fixed per-channel assumptions, not invoiced spend
      summary: {
        totalHires,
        totalCost,
        avgCostPerHire: totalHires > 0 ? Math.round(totalCost / totalHires) : 0,
      },
    };
  }
}
