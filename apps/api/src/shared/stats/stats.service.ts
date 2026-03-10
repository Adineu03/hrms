import { Inject, Injectable } from '@nestjs/common';
import { eq, and, count } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import * as schema from '../../infrastructure/database/schema';
import { users } from '../../infrastructure/database/schema/users';
import { orgModules } from '../../infrastructure/database/schema/org-modules';
import { leaveRequests } from '../../infrastructure/database/schema/leave-requests';

@Injectable()
export class StatsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getOrgStats(orgId: string) {
    const [employeeCountRow] = await this.db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.orgId, orgId), eq(users.isActive, true)));

    const [activeModulesRow] = await this.db
      .select({ value: count() })
      .from(orgModules)
      .where(and(eq(orgModules.orgId, orgId), eq(orgModules.isActive, true)));

    const [pendingLeavesRow] = await this.db
      .select({ value: count() })
      .from(leaveRequests)
      .where(and(eq(leaveRequests.orgId, orgId), eq(leaveRequests.status, 'pending')));

    return {
      totalEmployees: Number(employeeCountRow?.value ?? 0),
      activeModules: Number(activeModulesRow?.value ?? 0),
      pendingApprovals: Number(pendingLeavesRow?.value ?? 0),
    };
  }
}
