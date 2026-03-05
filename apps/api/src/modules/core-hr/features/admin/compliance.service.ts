import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { documents } from '../../../../infrastructure/database/schema/documents';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { orgs } from '../../../../infrastructure/database/schema/orgs';

@Injectable()
export class ComplianceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getDashboard(orgId: string) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Expired documents
    const expiredDocs = await this.db
      .select({
        id: documents.id,
        employeeId: documents.employeeId,
        name: documents.name,
        category: documents.category,
        expiryDate: documents.expiryDate,
      })
      .from(documents)
      .where(
        and(
          eq(documents.orgId, orgId),
          lte(documents.expiryDate, now.toISOString().split('T')[0]),
        ),
      );

    // Expiring soon (within 30 days)
    const expiringSoonDocs = await this.db
      .select({
        id: documents.id,
        employeeId: documents.employeeId,
        name: documents.name,
        category: documents.category,
        expiryDate: documents.expiryDate,
      })
      .from(documents)
      .where(
        and(
          eq(documents.orgId, orgId),
          sql`${documents.expiryDate} > ${now.toISOString().split('T')[0]}`,
          lte(documents.expiryDate, thirtyDaysFromNow.toISOString().split('T')[0]),
        ),
      );

    // Probation tracking — employees with probation end date approaching
    const probationEnding = await this.db
      .select({
        userId: employeeProfiles.userId,
        probationEndDate: employeeProfiles.probationEndDate,
      })
      .from(employeeProfiles)
      .where(
        and(
          eq(employeeProfiles.orgId, orgId),
          sql`${employeeProfiles.probationEndDate} IS NOT NULL`,
          lte(employeeProfiles.probationEndDate, thirtyDaysFromNow.toISOString().split('T')[0]),
        ),
      );

    return {
      expiredDocuments: {
        count: expiredDocs.length,
        items: expiredDocs,
      },
      expiringSoonDocuments: {
        count: expiringSoonDocs.length,
        items: expiringSoonDocs,
      },
      probationEnding: {
        count: probationEnding.length,
        items: probationEnding,
      },
    };
  }

  async getDocumentRetention(orgId: string) {
    const [org] = await this.db
      .select({ config: orgs.config })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    const config = (org?.config as Record<string, any>) ?? {};
    return config.documentRetentionPolicies ?? {};
  }

  async saveDocumentRetention(orgId: string, policies: Record<string, any>) {
    const [org] = await this.db
      .select({ config: orgs.config })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    const existingConfig = (org?.config as Record<string, any>) ?? {};
    const updatedConfig = { ...existingConfig, documentRetentionPolicies: policies };

    await this.db
      .update(orgs)
      .set({ config: updatedConfig, updatedAt: new Date() })
      .where(eq(orgs.id, orgId));

    return { success: true, policies };
  }

  async getTrainingTracking(orgId: string) {
    // Training tracking is read from org config — mandatory training requirements
    const [org] = await this.db
      .select({ config: orgs.config })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    const config = (org?.config as Record<string, any>) ?? {};
    const requirements = (config.mandatoryTraining as any[]) ?? [];

    // For each requirement, count how many employees have completed it
    // Stored as org config for now; real implementation would use a training table
    return {
      requirements,
      summary: {
        total: requirements.length,
        // Stub: completion data would come from a training_completions table
        completionRate: 0,
      },
    };
  }
}
