import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { departments } from '../../../../infrastructure/database/schema/departments';

@Injectable()
export class HeadcountService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getDashboard(orgId: string, managerId: string) {
    // Count active employees under this manager, grouped by department
    const rows = await this.db
      .select({
        departmentId: employeeProfiles.departmentId,
        departmentName: departments.name,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .leftJoin(departments, eq(employeeProfiles.departmentId, departments.id))
      .where(
        and(
          eq(employeeProfiles.managerId, managerId),
          eq(users.orgId, orgId),
          eq(users.isActive, true),
        ),
      )
      .groupBy(employeeProfiles.departmentId, departments.name);

    const totalFilled = rows.reduce((sum, r) => sum + r.count, 0);

    const byDepartment = rows.map((r) => ({
      departmentId: r.departmentId,
      departmentName: r.departmentName ?? 'Unassigned',
      filled: r.count,
      approved: r.count, // Approved positions will come from Workforce Planning module
    }));

    return {
      totalFilled,
      totalApproved: totalFilled, // Stub: equals filled until Workforce Planning is active
      byDepartment,
      note: 'Approved positions data will be enriched when Workforce Planning module is activated.',
    };
  }

  async getBudget(_orgId: string, _managerId: string) {
    return {
      budgetAllocated: null,
      budgetUtilized: null,
      variance: null,
      message:
        'Budget data will be available when Workforce Planning module is activated.',
    };
  }
}
