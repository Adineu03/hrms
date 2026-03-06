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

    const totalRequisitions = requisitionStats.reduce((sum, r) => sum + r.count, 0);
    const openRequisitions = requisitionStats
      .filter((r) => ['approved', 'pending_approval', 'draft'].includes(r.status))
      .reduce((sum, r) => sum + r.count, 0);
    const filledRequisitions = requisitionStats
      .filter((r) => r.status === 'filled')
      .reduce((sum, r) => sum + r.count, 0);

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

    // Total offers
    const offerStats = await this.db
      .select({
        status: schema.offerLetters.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.offerLetters)
      .where(eq(schema.offerLetters.orgId, orgId))
      .groupBy(schema.offerLetters.status);

    // Average time-to-hire (from requisition creation to offer acceptance)
    const [avgTimeToHire] = await this.db.execute(sql`
      SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (ol.accepted_at - jr.created_at)) / 86400)::int,
        0
      ) AS avg_days
      FROM offer_letters ol
      JOIN job_requisitions jr ON ol.requisition_id = jr.id
      WHERE ol.org_id = ${orgId}
        AND ol.accepted_at IS NOT NULL
    `);

    return {
      totalRequisitions,
      openRequisitions,
      filledRequisitions,
      requisitionsByStatus: requisitionStats,
      totalApplications: appStats?.count ?? 0,
      totalCandidates: candidateStats?.count ?? 0,
      offersByStatus: offerStats,
      averageTimeToHireDays: (avgTimeToHire as any)?.avg_days ?? 0,
    };
  }

  async getTimeToHire(orgId: string, filters: { groupBy?: string }) {
    const groupByField = filters.groupBy ?? 'department';

    if (groupByField === 'department') {
      const rows = await this.db.execute(sql`
        SELECT
          d.name AS group_name,
          COUNT(ol.id)::int AS hires,
          COALESCE(AVG(EXTRACT(EPOCH FROM (ol.accepted_at - jr.created_at)) / 86400)::int, 0) AS avg_days,
          COALESCE(MIN(EXTRACT(EPOCH FROM (ol.accepted_at - jr.created_at)) / 86400)::int, 0) AS min_days,
          COALESCE(MAX(EXTRACT(EPOCH FROM (ol.accepted_at - jr.created_at)) / 86400)::int, 0) AS max_days
        FROM offer_letters ol
        JOIN job_requisitions jr ON ol.requisition_id = jr.id
        LEFT JOIN departments d ON jr.department_id = d.id
        WHERE ol.org_id = ${orgId} AND ol.accepted_at IS NOT NULL
        GROUP BY d.name
        ORDER BY avg_days DESC
      `);

      return { groupBy: 'department', data: rows };
    }

    if (groupByField === 'source') {
      const rows = await this.db.execute(sql`
        SELECT
          a.source AS group_name,
          COUNT(ol.id)::int AS hires,
          COALESCE(AVG(EXTRACT(EPOCH FROM (ol.accepted_at - a.applied_at)) / 86400)::int, 0) AS avg_days,
          COALESCE(MIN(EXTRACT(EPOCH FROM (ol.accepted_at - a.applied_at)) / 86400)::int, 0) AS min_days,
          COALESCE(MAX(EXTRACT(EPOCH FROM (ol.accepted_at - a.applied_at)) / 86400)::int, 0) AS max_days
        FROM offer_letters ol
        JOIN applications a ON ol.application_id = a.id
        WHERE ol.org_id = ${orgId} AND ol.accepted_at IS NOT NULL
        GROUP BY a.source
        ORDER BY avg_days DESC
      `);

      return { groupBy: 'source', data: rows };
    }

    // Default: group by role/title
    const rows = await this.db.execute(sql`
      SELECT
        jr.title AS group_name,
        COUNT(ol.id)::int AS hires,
        COALESCE(AVG(EXTRACT(EPOCH FROM (ol.accepted_at - jr.created_at)) / 86400)::int, 0) AS avg_days,
        COALESCE(MIN(EXTRACT(EPOCH FROM (ol.accepted_at - jr.created_at)) / 86400)::int, 0) AS min_days,
        COALESCE(MAX(EXTRACT(EPOCH FROM (ol.accepted_at - jr.created_at)) / 86400)::int, 0) AS max_days
      FROM offer_letters ol
      JOIN job_requisitions jr ON ol.requisition_id = jr.id
      WHERE ol.org_id = ${orgId} AND ol.accepted_at IS NOT NULL
      GROUP BY jr.title
      ORDER BY avg_days DESC
    `);

    return { groupBy: 'role', data: rows };
  }

  async getSourceEffectiveness(orgId: string) {
    // Applications per source
    const applicationsBySource = await this.db
      .select({
        source: schema.applications.source,
        totalApplications: sql<number>`count(*)::int`,
      })
      .from(schema.applications)
      .where(eq(schema.applications.orgId, orgId))
      .groupBy(schema.applications.source)
      .orderBy(desc(sql`count(*)`));

    // Hires per source
    const hiresBySource = await this.db.execute(sql`
      SELECT
        a.source,
        COUNT(DISTINCT a.id)::int AS total_applications,
        COUNT(DISTINCT CASE WHEN a.status = 'hired' THEN a.id END)::int AS hires,
        COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN a.id END)::int AS interviews_conducted,
        CASE
          WHEN COUNT(DISTINCT a.id) > 0
          THEN ROUND(COUNT(DISTINCT CASE WHEN a.status = 'hired' THEN a.id END)::numeric / COUNT(DISTINCT a.id) * 100, 2)
          ELSE 0
        END AS conversion_rate
      FROM applications a
      LEFT JOIN interviews i ON a.id = i.application_id
      WHERE a.org_id = ${orgId}
      GROUP BY a.source
      ORDER BY conversion_rate DESC
    `);

    return {
      applicationsBySource,
      sourceEffectiveness: hiresBySource,
    };
  }

  async getPipelineFunnel(orgId: string, filters: { requisitionId?: string }) {
    let whereClause = sql`a.org_id = ${orgId}`;
    if (filters.requisitionId) {
      whereClause = sql`a.org_id = ${orgId} AND a.requisition_id = ${filters.requisitionId}`;
    }

    // Count per stage
    const stageData = await this.db.execute(sql`
      SELECT
        rps.name AS stage_name,
        rps.sort_order,
        COUNT(DISTINCT a.id)::int AS candidate_count
      FROM applications a
      LEFT JOIN recruitment_pipeline_stages rps ON a.current_stage_id = rps.id
      WHERE ${whereClause}
      GROUP BY rps.name, rps.sort_order
      ORDER BY rps.sort_order ASC NULLS LAST
    `);

    // Overall status counts
    const statusCounts = await this.db
      .select({
        status: schema.applications.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.applications)
      .where(eq(schema.applications.orgId, orgId))
      .groupBy(schema.applications.status);

    // Calculate drop-off rates between stages
    const stages = stageData as any[];
    const funnelWithDropoff = stages.map((stage, index) => {
      const prevCount = index > 0 ? stages[index - 1].candidate_count : stage.candidate_count;
      const dropOffRate =
        prevCount > 0 && index > 0
          ? Number(((1 - stage.candidate_count / prevCount) * 100).toFixed(2))
          : 0;

      return {
        stageName: stage.stage_name ?? 'Unassigned',
        sortOrder: stage.sort_order,
        candidateCount: stage.candidate_count,
        dropOffRate,
      };
    });

    return {
      funnel: funnelWithDropoff,
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

  async getHiringCost(orgId: string) {
    // Budget vs actual by requisition
    const budgetAnalysis = await this.db.execute(sql`
      SELECT
        jr.title,
        jr.budget_amount::numeric AS budget,
        jr.currency,
        jr.headcount,
        jr.filled_count,
        COUNT(DISTINCT a.id)::int AS total_applications,
        COUNT(DISTINCT i.id)::int AS total_interviews,
        COUNT(DISTINCT ol.id)::int AS total_offers,
        CASE
          WHEN jr.filled_count > 0 AND jr.budget_amount IS NOT NULL
          THEN ROUND(jr.budget_amount::numeric / jr.filled_count, 2)
          ELSE NULL
        END AS cost_per_hire
      FROM job_requisitions jr
      LEFT JOIN applications a ON jr.id = a.requisition_id
      LEFT JOIN interviews i ON a.id = i.application_id
      LEFT JOIN offer_letters ol ON jr.id = ol.requisition_id
      WHERE jr.org_id = ${orgId} AND jr.is_active = true
      GROUP BY jr.id, jr.title, jr.budget_amount, jr.currency, jr.headcount, jr.filled_count
      ORDER BY jr.created_at DESC
    `);

    // Summary metrics
    const [summary] = await this.db.execute(sql`
      SELECT
        COALESCE(SUM(budget_amount::numeric), 0) AS total_budget,
        COALESCE(SUM(filled_count), 0)::int AS total_hires,
        CASE
          WHEN SUM(filled_count) > 0
          THEN ROUND(SUM(budget_amount::numeric) / SUM(filled_count), 2)
          ELSE 0
        END AS avg_cost_per_hire
      FROM job_requisitions
      WHERE org_id = ${orgId} AND is_active = true
    `);

    return {
      summary: summary ?? { total_budget: 0, total_hires: 0, avg_cost_per_hire: 0 },
      byRequisition: budgetAnalysis,
    };
  }
}
