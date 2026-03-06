import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class OnboardingAnalyticsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getOverview(orgId: string) {
    // Total onboardings by status
    const statusCounts = await this.db
      .select({
        status: schema.employeeOnboardings.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.employeeOnboardings)
      .where(
        and(
          eq(schema.employeeOnboardings.orgId, orgId),
          eq(schema.employeeOnboardings.isActive, true),
        ),
      )
      .groupBy(schema.employeeOnboardings.status);

    const totalOnboardings = statusCounts.reduce((sum, r) => sum + r.count, 0);
    const activeOnboardings = statusCounts
      .filter((r) => ['in_progress', 'not_started'].includes(r.status))
      .reduce((sum, r) => sum + r.count, 0);
    const completedOnboardings = statusCounts
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + r.count, 0);

    // Average completion time in days
    const [avgCompletion] = await this.db.execute(sql`
      SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)::int,
        0
      ) AS avg_days
      FROM employee_onboardings
      WHERE org_id = ${orgId}
        AND is_active = true
        AND completed_at IS NOT NULL
    `);

    // Average progress percentage of active onboardings
    const [avgProgress] = await this.db.execute(sql`
      SELECT COALESCE(AVG(progress_percentage::numeric), 0)::numeric(5,2) AS avg_progress
      FROM employee_onboardings
      WHERE org_id = ${orgId}
        AND is_active = true
        AND status IN ('in_progress', 'not_started')
    `);

    return {
      totalOnboardings,
      activeOnboardings,
      completedOnboardings,
      onboardingsByStatus: statusCounts,
      averageCompletionDays: (avgCompletion as any)?.avg_days ?? 0,
      averageProgressPercentage: parseFloat((avgProgress as any)?.avg_progress ?? '0'),
    };
  }

  async getTimeToProductivity(orgId: string, filters: { groupBy?: string }) {
    const groupByField = filters.groupBy ?? 'department';

    if (groupByField === 'department') {
      const rows = await this.db.execute(sql`
        SELECT
          d.name AS group_name,
          COUNT(eo.id)::int AS total_onboardings,
          COALESCE(AVG(EXTRACT(EPOCH FROM (eo.completed_at - eo.created_at)) / 86400)::int, 0) AS avg_days,
          COALESCE(MIN(EXTRACT(EPOCH FROM (eo.completed_at - eo.created_at)) / 86400)::int, 0) AS min_days,
          COALESCE(MAX(EXTRACT(EPOCH FROM (eo.completed_at - eo.created_at)) / 86400)::int, 0) AS max_days
        FROM employee_onboardings eo
        LEFT JOIN users u ON eo.employee_id = u.id
        LEFT JOIN employee_profiles ep ON u.id = ep.user_id
        LEFT JOIN departments d ON ep.department_id = d.id
        WHERE eo.org_id = ${orgId}
          AND eo.is_active = true
          AND eo.completed_at IS NOT NULL
        GROUP BY d.name
        ORDER BY avg_days DESC
      `);

      return { groupBy: 'department', data: rows };
    }

    // Group by designation/role
    const rows = await this.db.execute(sql`
      SELECT
        des.name AS group_name,
        COUNT(eo.id)::int AS total_onboardings,
        COALESCE(AVG(EXTRACT(EPOCH FROM (eo.completed_at - eo.created_at)) / 86400)::int, 0) AS avg_days,
        COALESCE(MIN(EXTRACT(EPOCH FROM (eo.completed_at - eo.created_at)) / 86400)::int, 0) AS min_days,
        COALESCE(MAX(EXTRACT(EPOCH FROM (eo.completed_at - eo.created_at)) / 86400)::int, 0) AS max_days
      FROM employee_onboardings eo
      LEFT JOIN users u ON eo.employee_id = u.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      LEFT JOIN designations des ON ep.designation_id = des.id
      WHERE eo.org_id = ${orgId}
        AND eo.is_active = true
        AND eo.completed_at IS NOT NULL
      GROUP BY des.name
      ORDER BY avg_days DESC
    `);

    return { groupBy: 'role', data: rows };
  }

  async getTaskCompletionRates(orgId: string, filters: { groupBy?: string }) {
    const groupByField = filters.groupBy ?? 'taskOwner';

    if (groupByField === 'department') {
      const rows = await this.db.execute(sql`
        SELECT
          d.name AS group_name,
          COUNT(eot.id)::int AS total_tasks,
          COUNT(CASE WHEN eot.status = 'completed' THEN 1 END)::int AS completed_tasks,
          COUNT(CASE WHEN eot.status = 'pending' THEN 1 END)::int AS pending_tasks,
          COUNT(CASE WHEN eot.status = 'overdue' THEN 1 END)::int AS overdue_tasks,
          CASE
            WHEN COUNT(eot.id) > 0
            THEN ROUND(COUNT(CASE WHEN eot.status = 'completed' THEN 1 END)::numeric / COUNT(eot.id) * 100, 2)
            ELSE 0
          END AS completion_rate
        FROM employee_onboarding_tasks eot
        LEFT JOIN users u ON eot.employee_id = u.id
        LEFT JOIN employee_profiles ep ON u.id = ep.user_id
        LEFT JOIN departments d ON ep.department_id = d.id
        WHERE eot.org_id = ${orgId} AND eot.is_active = true
        GROUP BY d.name
        ORDER BY completion_rate DESC
      `);

      return { groupBy: 'department', data: rows };
    }

    // Default: group by task owner
    const rows = await this.db
      .select({
        groupName: schema.employeeOnboardingTasks.taskOwner,
        totalTasks: sql<number>`count(*)::int`,
        completedTasks: sql<number>`count(case when ${schema.employeeOnboardingTasks.status} = 'completed' then 1 end)::int`,
        pendingTasks: sql<number>`count(case when ${schema.employeeOnboardingTasks.status} = 'pending' then 1 end)::int`,
        overdueTasks: sql<number>`count(case when ${schema.employeeOnboardingTasks.status} = 'overdue' then 1 end)::int`,
        completionRate: sql<number>`case when count(*) > 0 then round(count(case when ${schema.employeeOnboardingTasks.status} = 'completed' then 1 end)::numeric / count(*) * 100, 2) else 0 end`,
      })
      .from(schema.employeeOnboardingTasks)
      .where(
        and(
          eq(schema.employeeOnboardingTasks.orgId, orgId),
          eq(schema.employeeOnboardingTasks.isActive, true),
        ),
      )
      .groupBy(schema.employeeOnboardingTasks.taskOwner);

    return { groupBy: 'taskOwner', data: rows };
  }

  async getBottlenecks(orgId: string) {
    // Tasks that take longest to complete (avg time) and have highest pending count
    const rows = await this.db.execute(sql`
      SELECT
        eot.title,
        eot.task_type,
        eot.task_owner,
        COUNT(eot.id)::int AS total_assigned,
        COUNT(CASE WHEN eot.status = 'pending' THEN 1 END)::int AS pending_count,
        COUNT(CASE WHEN eot.status = 'completed' THEN 1 END)::int AS completed_count,
        COALESCE(
          AVG(
            CASE WHEN eot.completed_at IS NOT NULL
              THEN EXTRACT(EPOCH FROM (eot.completed_at - eot.created_at)) / 86400
            END
          )::int,
          0
        ) AS avg_completion_days,
        CASE
          WHEN COUNT(eot.id) > 0
          THEN ROUND(COUNT(CASE WHEN eot.status = 'completed' THEN 1 END)::numeric / COUNT(eot.id) * 100, 2)
          ELSE 0
        END AS completion_rate
      FROM employee_onboarding_tasks eot
      WHERE eot.org_id = ${orgId} AND eot.is_active = true
      GROUP BY eot.title, eot.task_type, eot.task_owner
      ORDER BY pending_count DESC, avg_completion_days DESC
      LIMIT 20
    `);

    return { data: rows };
  }

  async getSatisfaction(orgId: string) {
    // Aggregate onboarding survey data from employee_onboardings.onboarding_survey
    const rows = await this.db.execute(sql`
      SELECT
        COALESCE((onboarding_survey->>'overallRating')::numeric, 0) AS rating,
        COUNT(*)::int AS count
      FROM employee_onboardings
      WHERE org_id = ${orgId}
        AND is_active = true
        AND onboarding_survey IS NOT NULL
        AND onboarding_survey->>'overallRating' IS NOT NULL
      GROUP BY onboarding_survey->>'overallRating'
      ORDER BY rating DESC
    `);

    const [avgSatisfaction] = await this.db.execute(sql`
      SELECT
        COALESCE(AVG((onboarding_survey->>'overallRating')::numeric), 0)::numeric(3,2) AS avg_rating,
        COUNT(*)::int AS total_responses
      FROM employee_onboardings
      WHERE org_id = ${orgId}
        AND is_active = true
        AND onboarding_survey IS NOT NULL
        AND onboarding_survey->>'overallRating' IS NOT NULL
    `);

    return {
      averageRating: parseFloat((avgSatisfaction as any)?.avg_rating ?? '0'),
      totalResponses: (avgSatisfaction as any)?.total_responses ?? 0,
      ratingDistribution: rows,
    };
  }

  async getCostTracking(orgId: string) {
    // Cost metrics from onboarding metadata
    const [summary] = await this.db.execute(sql`
      SELECT
        COUNT(*)::int AS total_onboardings,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed_onboardings,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)::int, 0) AS avg_days_to_complete,
        COALESCE(AVG(total_tasks), 0)::int AS avg_tasks_per_onboarding,
        COALESCE(AVG(completed_tasks), 0)::int AS avg_completed_tasks
      FROM employee_onboardings
      WHERE org_id = ${orgId} AND is_active = true
    `);

    // Monthly onboarding counts
    const monthlyTrends = await this.db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        COUNT(*)::int AS onboardings_initiated,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS onboardings_completed
      FROM employee_onboardings
      WHERE org_id = ${orgId} AND is_active = true
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `);

    return {
      summary: summary ?? {},
      monthlyTrends,
    };
  }
}
