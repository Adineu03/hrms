import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class DemoOrgManagementService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getDemoOrgs(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.demoOrgs)
      .where(and(eq(schema.demoOrgs.orgId, orgId), eq(schema.demoOrgs.isActive, true)))
      .orderBy(desc(schema.demoOrgs.updatedAt));
    return { data: rows, meta: { total: rows.length } };
  }

  async createDemoOrg(orgId: string, body: { sandboxName: string; industryTemplate: string; employeeCount: number }) {
    const [row] = await this.db
      .insert(schema.demoOrgs)
      .values({
        orgId,
        sandboxName: body.sandboxName,
        industryTemplate: body.industryTemplate ?? 'it-services',
        employeeCount: body.employeeCount ?? 10,
        status: 'active',
      })
      .returning();
    return { data: row };
  }

  async resetDemoOrg(orgId: string, id: string) {
    const [row] = await this.db
      .update(schema.demoOrgs)
      .set({ status: 'resetting', lastResetAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.demoOrgs.id, id), eq(schema.demoOrgs.orgId, orgId)))
      .returning();
    return { data: row };
  }

  async deleteDemoOrg(orgId: string, id: string) {
    await this.db
      .update(schema.demoOrgs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.demoOrgs.id, id), eq(schema.demoOrgs.orgId, orgId)));
    return { data: { success: true } };
  }
}
