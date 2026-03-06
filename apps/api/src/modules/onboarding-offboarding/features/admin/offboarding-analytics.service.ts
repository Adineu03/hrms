import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class OffboardingAnalyticsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getOverview(orgId: string) {
    // Total offboardings by status
    const statusCounts = await this.db
      .select({
        status: schema.employeeOffboardings.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.employeeOffboardings)
      .where(
        and(
          eq(schema.employeeOffboardings.orgId, orgId),
          eq(schema.employeeOffboardings.isActive, true),
        ),
      )
      .groupBy(schema.employeeOffboardings.status);

    const totalExits = statusCounts.reduce((sum, r) => sum + r.count, 0);
    const pendingExits = statusCounts
      .filter((r) => ['initiated', 'in_progress'].includes(r.status))
      .reduce((sum, r) => sum + r.count, 0);
    const completedExits = statusCounts
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + r.count, 0);

    // Exit type distribution
    const exitTypeCounts = await this.db
      .select({
        exitType: schema.employeeOffboardings.exitType,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.employeeOffboardings)
      .where(
        and(
          eq(schema.employeeOffboardings.orgId, orgId),
          eq(schema.employeeOffboardings.isActive, true),
        ),
      )
      .groupBy(schema.employeeOffboardings.exitType);

    // Average processing time
    const [avgProcessing] = await this.db.execute(sql`
      SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::int,
        0
      ) AS avg_days
      FROM employee_offboardings
      WHERE org_id = ${orgId}
        AND is_active = true
        AND status = 'completed'
    `);

    return {
      totalExits,
      pendingExits,
      completedExits,
      offboardingsByStatus: statusCounts,
      exitTypeDistribution: exitTypeCounts,
      averageProcessingDays: (avgProcessing as any)?.avg_days ?? 0,
    };
  }

  async getExitTrends(orgId: string, filters: { groupBy?: string }) {
    const groupByField = filters.groupBy ?? 'department';

    if (groupByField === 'department') {
      const rows = await this.db.execute(sql`
        SELECT
          d.name AS group_name,
          COUNT(eo.id)::int AS total_exits,
          COUNT(CASE WHEN eo.exit_type = 'resignation' THEN 1 END)::int AS resignations,
          COUNT(CASE WHEN eo.exit_type = 'termination' THEN 1 END)::int AS terminations,
          COUNT(CASE WHEN eo.exit_type = 'retirement' THEN 1 END)::int AS retirements,
          COUNT(CASE WHEN eo.exit_type = 'contract_end' THEN 1 END)::int AS contract_ends
        FROM employee_offboardings eo
        LEFT JOIN users u ON eo.employee_id = u.id
        LEFT JOIN employee_profiles ep ON u.id = ep.user_id
        LEFT JOIN departments d ON ep.department_id = d.id
        WHERE eo.org_id = ${orgId} AND eo.is_active = true
        GROUP BY d.name
        ORDER BY total_exits DESC
      `);

      return { groupBy: 'department', data: rows };
    }

    if (groupByField === 'reason') {
      const rows = await this.db
        .select({
          groupName: schema.employeeOffboardings.exitType,
          totalExits: sql<number>`count(*)::int`,
        })
        .from(schema.employeeOffboardings)
        .where(
          and(
            eq(schema.employeeOffboardings.orgId, orgId),
            eq(schema.employeeOffboardings.isActive, true),
          ),
        )
        .groupBy(schema.employeeOffboardings.exitType);

      return { groupBy: 'reason', data: rows };
    }

    // Group by tenure (monthly)
    const rows = await this.db.execute(sql`
      SELECT
        TO_CHAR(eo.created_at, 'YYYY-MM') AS month,
        COUNT(eo.id)::int AS total_exits,
        COUNT(CASE WHEN eo.exit_type = 'resignation' THEN 1 END)::int AS resignations,
        COUNT(CASE WHEN eo.exit_type = 'termination' THEN 1 END)::int AS terminations
      FROM employee_offboardings eo
      WHERE eo.org_id = ${orgId} AND eo.is_active = true
      GROUP BY TO_CHAR(eo.created_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `);

    return { groupBy: 'monthly', data: rows };
  }

  async getProcessingTime(orgId: string, filters: { groupBy?: string }) {
    const groupByField = filters.groupBy ?? 'department';

    if (groupByField === 'department') {
      const rows = await this.db.execute(sql`
        SELECT
          d.name AS group_name,
          COUNT(eo.id)::int AS total_exits,
          COALESCE(AVG(
            CASE WHEN eo.last_working_date IS NOT NULL AND eo.resignation_date IS NOT NULL
              THEN (eo.last_working_date::date - eo.resignation_date::date)
            END
          )::int, 0) AS avg_notice_days,
          COALESCE(AVG(EXTRACT(EPOCH FROM (eo.updated_at - eo.created_at)) / 86400)::int, 0) AS avg_processing_days
        FROM employee_offboardings eo
        LEFT JOIN users u ON eo.employee_id = u.id
        LEFT JOIN employee_profiles ep ON u.id = ep.user_id
        LEFT JOIN departments d ON ep.department_id = d.id
        WHERE eo.org_id = ${orgId}
          AND eo.is_active = true
          AND eo.status = 'completed'
        GROUP BY d.name
        ORDER BY avg_processing_days DESC
      `);

      return { groupBy: 'department', data: rows };
    }

    // By exit type
    const rows = await this.db.execute(sql`
      SELECT
        eo.exit_type AS group_name,
        COUNT(eo.id)::int AS total_exits,
        COALESCE(AVG(EXTRACT(EPOCH FROM (eo.updated_at - eo.created_at)) / 86400)::int, 0) AS avg_processing_days,
        COALESCE(MIN(EXTRACT(EPOCH FROM (eo.updated_at - eo.created_at)) / 86400)::int, 0) AS min_days,
        COALESCE(MAX(EXTRACT(EPOCH FROM (eo.updated_at - eo.created_at)) / 86400)::int, 0) AS max_days
      FROM employee_offboardings eo
      WHERE eo.org_id = ${orgId}
        AND eo.is_active = true
        AND eo.status = 'completed'
      GROUP BY eo.exit_type
      ORDER BY avg_processing_days DESC
    `);

    return { groupBy: 'exitType', data: rows };
  }

  async getAssetRecovery(orgId: string) {
    // Asset return status aggregation from JSONB field
    const rows = await this.db.execute(sql`
      SELECT
        eo.status AS offboarding_status,
        COUNT(eo.id)::int AS total,
        COUNT(CASE WHEN eo.asset_return_status::text != '[]' AND eo.asset_return_status IS NOT NULL THEN 1 END)::int AS with_assets,
        COUNT(CASE WHEN eo.settlement_status = 'completed' THEN 1 END)::int AS settlements_completed,
        COUNT(CASE WHEN eo.settlement_status = 'pending' THEN 1 END)::int AS settlements_pending
      FROM employee_offboardings eo
      WHERE eo.org_id = ${orgId} AND eo.is_active = true
      GROUP BY eo.status
      ORDER BY total DESC
    `);

    // Overall asset recovery summary
    const [summary] = await this.db.execute(sql`
      SELECT
        COUNT(*)::int AS total_offboardings,
        COUNT(CASE WHEN asset_return_status::text != '[]' AND asset_return_status IS NOT NULL THEN 1 END)::int AS offboardings_with_assets,
        COUNT(CASE WHEN settlement_status = 'completed' THEN 1 END)::int AS settlements_completed,
        COUNT(CASE WHEN handover_status = 'completed' THEN 1 END)::int AS handovers_completed
      FROM employee_offboardings
      WHERE org_id = ${orgId} AND is_active = true
    `);

    return {
      summary: summary ?? {},
      byStatus: rows,
    };
  }

  async getExitInterviewRates(orgId: string) {
    // Total offboardings vs exit interviews conducted
    const [totals] = await this.db.execute(sql`
      SELECT
        COUNT(DISTINCT eo.id)::int AS total_offboardings,
        COUNT(DISTINCT ei.id)::int AS total_interviews,
        COUNT(DISTINCT CASE WHEN ei.status = 'completed' THEN ei.id END)::int AS completed_interviews,
        COUNT(DISTINCT CASE WHEN ei.status = 'scheduled' THEN ei.id END)::int AS scheduled_interviews,
        CASE
          WHEN COUNT(DISTINCT eo.id) > 0
          THEN ROUND(COUNT(DISTINCT CASE WHEN ei.status = 'completed' THEN ei.id END)::numeric / COUNT(DISTINCT eo.id) * 100, 2)
          ELSE 0
        END AS completion_rate
      FROM employee_offboardings eo
      LEFT JOIN exit_interviews ei ON eo.id = ei.offboarding_id AND ei.is_active = true
      WHERE eo.org_id = ${orgId} AND eo.is_active = true
    `);

    // Sentiment distribution from completed interviews
    const sentimentDist = await this.db
      .select({
        sentiment: schema.exitInterviews.sentiment,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.exitInterviews)
      .where(
        and(
          eq(schema.exitInterviews.orgId, orgId),
          eq(schema.exitInterviews.isActive, true),
        ),
      )
      .groupBy(schema.exitInterviews.sentiment);

    return {
      summary: totals ?? {},
      sentimentDistribution: sentimentDist,
    };
  }

  async getRehireTracking(orgId: string) {
    // Rehire eligibility stats
    const rehireStats = await this.db
      .select({
        rehireEligible: schema.employeeOffboardings.rehireEligible,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.employeeOffboardings)
      .where(
        and(
          eq(schema.employeeOffboardings.orgId, orgId),
          eq(schema.employeeOffboardings.isActive, true),
        ),
      )
      .groupBy(schema.employeeOffboardings.rehireEligible);

    const eligible = rehireStats.find((r) => r.rehireEligible === true)?.count ?? 0;
    const notEligible = rehireStats.find((r) => r.rehireEligible === false)?.count ?? 0;
    const unassessed = rehireStats.find((r) => r.rehireEligible === null)?.count ?? 0;

    // Rehire eligible by exit type
    const byExitType = await this.db.execute(sql`
      SELECT
        exit_type,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN rehire_eligible = true THEN 1 END)::int AS eligible,
        COUNT(CASE WHEN rehire_eligible = false THEN 1 END)::int AS not_eligible,
        COUNT(CASE WHEN rehire_eligible IS NULL THEN 1 END)::int AS unassessed
      FROM employee_offboardings
      WHERE org_id = ${orgId} AND is_active = true
      GROUP BY exit_type
      ORDER BY total DESC
    `);

    return {
      summary: {
        eligible,
        notEligible,
        unassessed,
        total: eligible + notEligible + unassessed,
      },
      byExitType,
    };
  }
}
