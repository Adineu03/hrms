import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, count } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class OvertimeConfigService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getSummary(orgId: string) {
    // Total overtime hours by department
    const departmentOT = await this.db.execute(sql`
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        COALESCE(SUM(ar.overtime_minutes), 0) AS total_overtime_minutes,
        COUNT(DISTINCT ar.employee_id) AS employee_count
      FROM attendance_records ar
      JOIN employee_profiles ep ON ep.user_id = ar.employee_id AND ep.org_id = ar.org_id
      JOIN departments d ON d.id = ep.department_id AND d.org_id = ar.org_id
      WHERE ar.org_id = ${orgId}
        AND ar.is_overtime = true
        AND ar.date >= (CURRENT_DATE - INTERVAL '30 days')::date
      GROUP BY d.id, d.name
      ORDER BY total_overtime_minutes DESC
    `);

    // Top employees by overtime
    const topEmployees = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        u.email,
        COALESCE(SUM(ar.overtime_minutes), 0) AS total_overtime_minutes
      FROM attendance_records ar
      JOIN users u ON u.id = ar.employee_id AND u.org_id = ar.org_id
      WHERE ar.org_id = ${orgId}
        AND ar.is_overtime = true
        AND ar.date >= (CURRENT_DATE - INTERVAL '30 days')::date
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY total_overtime_minutes DESC
      LIMIT 10
    `);

    // Total pending requests
    const [pendingCount] = await this.db
      .select({ total: count() })
      .from(schema.overtimeRequests)
      .where(
        and(
          eq(schema.overtimeRequests.orgId, orgId),
          eq(schema.overtimeRequests.status, 'pending'),
        ),
      );

    return {
      period: 'last_30_days',
      departmentBreakdown: departmentOT,
      topEmployees,
      pendingRequests: pendingCount?.total ?? 0,
    };
  }

  async listRequests(
    orgId: string,
    filters: {
      status?: string;
      startDate?: string;
      endDate?: string;
      departmentId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    // Build base query with joins to get employee and department info
    const conditions: any[] = [eq(schema.overtimeRequests.orgId, orgId)];

    if (filters.status) {
      conditions.push(eq(schema.overtimeRequests.status, filters.status));
    }
    if (filters.startDate) {
      conditions.push(gte(schema.overtimeRequests.date, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(schema.overtimeRequests.date, filters.endDate));
    }

    const rows = await this.db
      .select({
        request: schema.overtimeRequests,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
        departmentId: schema.employeeProfiles.departmentId,
      })
      .from(schema.overtimeRequests)
      .leftJoin(
        schema.users,
        and(
          eq(schema.overtimeRequests.employeeId, schema.users.id),
          eq(schema.overtimeRequests.orgId, schema.users.orgId),
        ),
      )
      .leftJoin(
        schema.employeeProfiles,
        and(
          eq(schema.overtimeRequests.employeeId, schema.employeeProfiles.userId),
          eq(schema.overtimeRequests.orgId, schema.employeeProfiles.orgId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.overtimeRequests.createdAt));

    // Filter by department in-memory (joined via employee profiles)
    let filtered = rows;
    if (filters.departmentId) {
      filtered = filtered.filter((r) => r.departmentId === filters.departmentId);
    }

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      data: paginated.map((r) => ({
        ...this.toRequestDto(r.request),
        employee: {
          id: r.request.employeeId,
          firstName: r.employeeFirstName,
          lastName: r.employeeLastName,
          email: r.employeeEmail,
        },
        departmentId: r.departmentId,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async reviewRequest(orgId: string, requestId: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.overtimeRequests)
      .where(
        and(
          eq(schema.overtimeRequests.id, requestId),
          eq(schema.overtimeRequests.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Overtime request not found');

    if (existing.status !== 'pending' && existing.status !== 'manager_approved') {
      throw new BadRequestException(
        `Cannot review a request with status "${existing.status}"`,
      );
    }

    const validStatuses = ['approved', 'rejected'];
    if (!data.status || !validStatuses.includes(data.status)) {
      throw new BadRequestException('status must be "approved" or "rejected"');
    }

    const now = new Date();
    const [updated] = await this.db
      .update(schema.overtimeRequests)
      .set({
        status: data.status,
        reviewedBy: data.reviewedBy ?? null,
        reviewedAt: now,
        reviewerComment: data.comment ?? null,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.overtimeRequests.id, requestId),
          eq(schema.overtimeRequests.orgId, orgId),
        ),
      )
      .returning();

    return this.toRequestDto(updated);
  }

  async getUtilizationReports(
    orgId: string,
    filters: { startDate?: string; endDate?: string; departmentId?: string },
  ) {
    // Overtime utilization by employee
    const byEmployee = await this.db.execute(sql`
      SELECT
        u.id AS employee_id,
        u.first_name,
        u.last_name,
        ep.department_id,
        d.name AS department_name,
        COALESCE(SUM(ar.overtime_minutes), 0) AS total_overtime_minutes,
        COUNT(*) FILTER (WHERE ar.is_overtime = true) AS overtime_days,
        COALESCE(SUM(otr.estimated_hours), 0) AS approved_ot_hours,
        COALESCE(SUM(otr.actual_hours), 0) AS actual_ot_hours
      FROM users u
      JOIN employee_profiles ep ON ep.user_id = u.id AND ep.org_id = u.org_id
      LEFT JOIN departments d ON d.id = ep.department_id AND d.org_id = u.org_id
      LEFT JOIN attendance_records ar ON ar.employee_id = u.id AND ar.org_id = u.org_id
        ${filters.startDate ? sql`AND ar.date >= ${filters.startDate}` : sql``}
        ${filters.endDate ? sql`AND ar.date <= ${filters.endDate}` : sql``}
      LEFT JOIN overtime_requests otr ON otr.employee_id = u.id AND otr.org_id = u.org_id
        AND otr.status = 'approved'
        ${filters.startDate ? sql`AND otr.date >= ${filters.startDate}` : sql``}
        ${filters.endDate ? sql`AND otr.date <= ${filters.endDate}` : sql``}
      WHERE u.org_id = ${orgId}
        ${filters.departmentId ? sql`AND ep.department_id = ${filters.departmentId}` : sql``}
      GROUP BY u.id, u.first_name, u.last_name, ep.department_id, d.name
      HAVING COALESCE(SUM(ar.overtime_minutes), 0) > 0 OR COALESCE(SUM(otr.actual_hours), 0) > 0
      ORDER BY total_overtime_minutes DESC
    `);

    // Overtime utilization by department
    const byDepartment = await this.db.execute(sql`
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        COUNT(DISTINCT ar.employee_id) AS employees_with_ot,
        COALESCE(SUM(ar.overtime_minutes), 0) AS total_overtime_minutes,
        ROUND(AVG(ar.overtime_minutes) FILTER (WHERE ar.overtime_minutes > 0), 1) AS avg_ot_minutes_per_day
      FROM departments d
      JOIN employee_profiles ep ON ep.department_id = d.id AND ep.org_id = d.org_id
      LEFT JOIN attendance_records ar ON ar.employee_id = ep.user_id AND ar.org_id = d.org_id
        AND ar.is_overtime = true
        ${filters.startDate ? sql`AND ar.date >= ${filters.startDate}` : sql``}
        ${filters.endDate ? sql`AND ar.date <= ${filters.endDate}` : sql``}
      WHERE d.org_id = ${orgId}
        ${filters.departmentId ? sql`AND d.id = ${filters.departmentId}` : sql``}
      GROUP BY d.id, d.name
      ORDER BY total_overtime_minutes DESC
    `);

    return {
      byEmployee,
      byDepartment,
    };
  }

  private toRequestDto(row: typeof schema.overtimeRequests.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      date: row.date,
      type: row.type,
      estimatedHours: row.estimatedHours,
      actualHours: row.actualHours,
      reason: row.reason,
      reasonCode: row.reasonCode,
      status: row.status,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewerComment: row.reviewerComment,
      overtimeRate: row.overtimeRate,
      compOffEligible: row.compOffEligible,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
