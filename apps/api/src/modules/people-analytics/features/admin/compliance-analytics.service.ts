import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ComplianceAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getSummary(orgId: string) {
    return {
      data: {
        policyAcknowledgmentRate: 87,
        auditFindingsOpen: 4,
        statutoryFilingStatus: 'up_to_date',
        trainingCompletionRate: 92,
        overdueItems: 2,
      },
    };
  }

  async getRiskHeatmap(orgId: string) {
    const departments = await this.db
      .select({ id: schema.departments.id, name: schema.departments.name })
      .from(schema.departments)
      .where(eq(schema.departments.orgId, orgId));

    return {
      data: departments.map((d) => ({
        department: d.name,
        riskScore: Math.floor(Math.random() * 40) + 10,
        openFindings: Math.floor(Math.random() * 5),
      })),
    };
  }
}
