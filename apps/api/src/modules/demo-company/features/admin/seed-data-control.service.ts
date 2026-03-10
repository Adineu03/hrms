import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class SeedDataControlService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getSeedStatus(orgId: string) {
    const [demoOrg] = await this.db
      .select()
      .from(schema.demoOrgs)
      .where(and(eq(schema.demoOrgs.orgId, orgId), eq(schema.demoOrgs.isActive, true)))
      .orderBy(desc(schema.demoOrgs.updatedAt))
      .limit(1);

    if (!demoOrg) {
      return { data: { seededModules: [], status: 'no-demo-org' } };
    }

    return {
      data: {
        seededModules: (demoOrg.seededModules as string[]) ?? [],
        status: demoOrg.status,
        lastResetAt: demoOrg.lastResetAt,
        sandboxName: demoOrg.sandboxName,
      },
    };
  }

  async triggerSeed(orgId: string, body: { modules: string[]; dateRangeDays: number }) {
    const [demoOrg] = await this.db
      .select()
      .from(schema.demoOrgs)
      .where(and(eq(schema.demoOrgs.orgId, orgId), eq(schema.demoOrgs.isActive, true)))
      .orderBy(desc(schema.demoOrgs.updatedAt))
      .limit(1);

    if (!demoOrg) {
      return { data: { success: false, message: 'No active demo org found' } };
    }

    const [updated] = await this.db
      .update(schema.demoOrgs)
      .set({
        seededModules: body.modules,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(schema.demoOrgs.id, demoOrg.id))
      .returning();

    return {
      data: {
        success: true,
        seededModules: updated.seededModules,
        dateRangeDays: body.dateRangeDays,
        message: `Seeding triggered for ${body.modules.length} module(s) over ${body.dateRangeDays} days`,
      },
    };
  }

  async getSeedLog(orgId: string) {
    const [demoOrg] = await this.db
      .select()
      .from(schema.demoOrgs)
      .where(and(eq(schema.demoOrgs.orgId, orgId), eq(schema.demoOrgs.isActive, true)))
      .orderBy(desc(schema.demoOrgs.updatedAt))
      .limit(1);

    if (!demoOrg) {
      return { data: { logs: [] } };
    }

    const seededModules = (demoOrg.seededModules as string[]) ?? [];
    const logs = seededModules.map((moduleKey: string, index: number) => ({
      id: index + 1,
      moduleKey,
      status: 'seeded',
      seededAt: demoOrg.updatedAt,
      sandboxName: demoOrg.sandboxName,
    }));

    return { data: { logs }, meta: { total: logs.length } };
  }
}
