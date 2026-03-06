import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TimesheetPolicyConfigService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getPolicy(orgId: string) {
    const [row] = await this.db
      .select()
      .from(schema.timesheetPolicies)
      .where(
        and(
          eq(schema.timesheetPolicies.orgId, orgId),
          eq(schema.timesheetPolicies.isDefault, true),
        ),
      )
      .limit(1);

    if (!row) {
      return { data: null, message: 'No timesheet policy configured yet' };
    }

    return this.toDto(row);
  }

  async upsertPolicy(orgId: string, data: Record<string, any>) {
    const now = new Date();

    // Check if a default policy already exists for this org
    const [existing] = await this.db
      .select()
      .from(schema.timesheetPolicies)
      .where(
        and(
          eq(schema.timesheetPolicies.orgId, orgId),
          eq(schema.timesheetPolicies.isDefault, true),
        ),
      )
      .limit(1);

    if (existing) {
      // Update the existing policy
      const updates: Record<string, any> = { updatedAt: now };
      const allowedFields = [
        'name', 'submissionFrequency', 'submissionDeadline', 'customDeadlineDay',
        'customDeadlineTime', 'minHoursPerDay', 'maxHoursPerDay', 'minHoursPerWeek',
        'maxHoursPerWeek', 'roundingRule', 'roundingInterval', 'lockAfterApproval',
        'lockAfterDays', 'gracePeriodDays', 'dailyMandatory', 'requireDescription',
        'autoApprovalEnabled', 'autoApprovalRules', 'escalationEnabled',
        'escalationHours', 'approvalLevels', 'delegationRules', 'metadata',
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) updates[field] = data[field];
      }

      const [updated] = await this.db
        .update(schema.timesheetPolicies)
        .set(updates)
        .where(
          and(
            eq(schema.timesheetPolicies.id, existing.id),
            eq(schema.timesheetPolicies.orgId, orgId),
          ),
        )
        .returning();

      return this.toDto(updated);
    } else {
      // Create a new default policy
      const [created] = await this.db
        .insert(schema.timesheetPolicies)
        .values({
          orgId,
          name: data.name ?? 'Default Timesheet Policy',
          submissionFrequency: data.submissionFrequency ?? 'weekly',
          submissionDeadline: data.submissionDeadline ?? 'end_of_week',
          customDeadlineDay: data.customDeadlineDay ?? null,
          customDeadlineTime: data.customDeadlineTime ?? null,
          minHoursPerDay: data.minHoursPerDay ?? '8',
          maxHoursPerDay: data.maxHoursPerDay ?? '12',
          minHoursPerWeek: data.minHoursPerWeek ?? '40',
          maxHoursPerWeek: data.maxHoursPerWeek ?? '60',
          roundingRule: data.roundingRule ?? 'none',
          roundingInterval: data.roundingInterval ?? 15,
          lockAfterApproval: data.lockAfterApproval ?? true,
          lockAfterDays: data.lockAfterDays ?? null,
          gracePeriodDays: data.gracePeriodDays ?? 2,
          dailyMandatory: data.dailyMandatory ?? false,
          requireDescription: data.requireDescription ?? false,
          autoApprovalEnabled: data.autoApprovalEnabled ?? false,
          autoApprovalRules: data.autoApprovalRules ?? [],
          escalationEnabled: data.escalationEnabled ?? false,
          escalationHours: data.escalationHours ?? null,
          approvalLevels: data.approvalLevels ?? [],
          delegationRules: data.delegationRules ?? {},
          metadata: data.metadata ?? {},
          isDefault: true,
          isActive: true,
        })
        .returning();

      return this.toDto(created);
    }
  }

  private toDto(row: typeof schema.timesheetPolicies.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      submissionFrequency: row.submissionFrequency,
      submissionDeadline: row.submissionDeadline,
      customDeadlineDay: row.customDeadlineDay,
      customDeadlineTime: row.customDeadlineTime,
      minHoursPerDay: row.minHoursPerDay,
      maxHoursPerDay: row.maxHoursPerDay,
      minHoursPerWeek: row.minHoursPerWeek,
      maxHoursPerWeek: row.maxHoursPerWeek,
      roundingRule: row.roundingRule,
      roundingInterval: row.roundingInterval,
      lockAfterApproval: row.lockAfterApproval,
      lockAfterDays: row.lockAfterDays,
      gracePeriodDays: row.gracePeriodDays,
      dailyMandatory: row.dailyMandatory,
      requireDescription: row.requireDescription,
      autoApprovalEnabled: row.autoApprovalEnabled,
      autoApprovalRules: row.autoApprovalRules,
      escalationEnabled: row.escalationEnabled,
      escalationHours: row.escalationHours,
      approvalLevels: row.approvalLevels,
      delegationRules: row.delegationRules,
      metadata: row.metadata,
      isDefault: row.isDefault,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
