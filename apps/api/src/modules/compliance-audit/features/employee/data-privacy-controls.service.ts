import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class DataPrivacyControlsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getMyPersonalData(orgId: string, userId: string) {
    const myAuditLogs = await this.db
      .select()
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.orgId, orgId), eq(schema.auditLogs.userId, userId)))
      .orderBy(schema.auditLogs.createdAt);

    const myAcknowledgments = await this.db
      .select()
      .from(schema.policyAcknowledgments)
      .where(and(eq(schema.policyAcknowledgments.orgId, orgId), eq(schema.policyAcknowledgments.employeeId, userId), eq(schema.policyAcknowledgments.isActive, true)));

    const myTrainings = await this.db
      .select()
      .from(schema.trainingCompletions)
      .where(and(eq(schema.trainingCompletions.orgId, orgId), eq(schema.trainingCompletions.employeeId, userId), eq(schema.trainingCompletions.isActive, true)));

    return {
      data: {
        userId,
        dataCategories: [
          {
            category: 'Activity Logs',
            recordCount: myAuditLogs.length,
            description: 'System activity and access logs',
          },
          {
            category: 'Policy Acknowledgments',
            recordCount: myAcknowledgments.length,
            description: 'Policy acknowledgment records',
          },
          {
            category: 'Training Records',
            recordCount: myTrainings.length,
            description: 'Compliance training completion records',
          },
        ],
        totalRecords: myAuditLogs.length + myAcknowledgments.length + myTrainings.length,
      },
    };
  }

  async requestDataExport(orgId: string, userId: string) {
    const [row] = await this.db
      .insert(schema.auditLogs)
      .values({
        orgId,
        userId,
        action: 'data_request',
        entity: 'employee',
        entityId: userId,
        description: `Employee ${userId} requested a data export`,
        newValue: { requestType: 'export', requestedAt: new Date() },
      })
      .returning();

    return {
      data: {
        requestId: row.id,
        status: 'submitted',
        message: 'Your data export request has been submitted. You will be notified when it is ready.',
        submittedAt: row.createdAt,
      },
    };
  }

  async submitCorrectionRequest(
    orgId: string,
    userId: string,
    dto: { field: string; currentValue: string; requestedValue: string; reason: string },
  ) {
    const [row] = await this.db
      .insert(schema.auditLogs)
      .values({
        orgId,
        userId,
        action: 'correction_request',
        entity: 'employee',
        entityId: userId,
        description: `Employee ${userId} requested data correction for field: ${dto.field}`,
        oldValue: { [dto.field]: dto.currentValue },
        newValue: { [dto.field]: dto.requestedValue, reason: dto.reason },
      })
      .returning();

    return {
      data: {
        requestId: row.id,
        status: 'submitted',
        field: dto.field,
        message: 'Your data correction request has been submitted for review.',
        submittedAt: row.createdAt,
      },
    };
  }

  async updateConsent(orgId: string, userId: string, dto: { consentType: string; granted: boolean }) {
    const [row] = await this.db
      .insert(schema.auditLogs)
      .values({
        orgId,
        userId,
        action: 'consent_update',
        entity: 'employee',
        entityId: userId,
        description: `Employee ${userId} updated consent for: ${dto.consentType}`,
        newValue: { consentType: dto.consentType, granted: dto.granted, updatedAt: new Date() },
      })
      .returning();

    return {
      data: {
        requestId: row.id,
        consentType: dto.consentType,
        granted: dto.granted,
        message: `Consent preference updated successfully.`,
        updatedAt: row.createdAt,
      },
    };
  }

  async requestDeletion(orgId: string, userId: string, dto: { reason: string }) {
    const [row] = await this.db
      .insert(schema.auditLogs)
      .values({
        orgId,
        userId,
        action: 'deletion_request',
        entity: 'employee',
        entityId: userId,
        description: `Employee ${userId} requested data deletion`,
        newValue: { reason: dto.reason, requestedAt: new Date() },
      })
      .returning();

    return {
      data: {
        requestId: row.id,
        status: 'submitted',
        message: 'Your data deletion request has been submitted. This will be reviewed by the Data Protection Officer.',
        submittedAt: row.createdAt,
      },
    };
  }
}
