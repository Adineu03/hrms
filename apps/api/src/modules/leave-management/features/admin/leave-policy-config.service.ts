import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LeavePolicyConfigService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getPolicy(orgId: string) {
    const [row] = await this.db
      .select()
      .from(schema.leavePolicies)
      .where(
        and(
          eq(schema.leavePolicies.orgId, orgId),
          eq(schema.leavePolicies.isDefault, true),
        ),
      )
      .limit(1);

    if (!row) {
      return { data: null, message: 'No leave policy configured yet' };
    }

    return this.toDto(row);
  }

  async upsertPolicy(orgId: string, data: Record<string, any>) {
    const now = new Date();

    // Check if a default policy already exists for this org
    const [existing] = await this.db
      .select()
      .from(schema.leavePolicies)
      .where(
        and(
          eq(schema.leavePolicies.orgId, orgId),
          eq(schema.leavePolicies.isDefault, true),
        ),
      )
      .limit(1);

    if (existing) {
      // Update the existing policy
      const updates: Record<string, any> = { updatedAt: now };
      const allowedFields = [
        'name', 'leaveYearStart', 'customYearStartMonth', 'customYearStartDay',
        'sandwichRuleEnabled', 'sandwichRuleType', 'autoApprovalEnabled',
        'autoApprovalRules', 'escalationEnabled', 'escalationHours',
        'halfDayEnabled', 'backdatedLeaveDays', 'minDaysBeforeRequest',
        'negativeBalanceAllowed', 'maxNegativeBalanceDays', 'yearEndProcessing',
        'compOffEarningRules', 'compOffExpiryDays', 'encashmentRules',
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) updates[field] = data[field];
      }

      const [updated] = await this.db
        .update(schema.leavePolicies)
        .set(updates)
        .where(
          and(
            eq(schema.leavePolicies.id, existing.id),
            eq(schema.leavePolicies.orgId, orgId),
          ),
        )
        .returning();

      return this.toDto(updated);
    } else {
      // Create a new default policy
      const [created] = await this.db
        .insert(schema.leavePolicies)
        .values({
          orgId,
          name: data.name ?? 'Default Leave Policy',
          leaveYearStart: data.leaveYearStart ?? 'calendar_year',
          customYearStartMonth: data.customYearStartMonth ?? null,
          customYearStartDay: data.customYearStartDay ?? null,
          sandwichRuleEnabled: data.sandwichRuleEnabled ?? false,
          sandwichRuleType: data.sandwichRuleType ?? null,
          autoApprovalEnabled: data.autoApprovalEnabled ?? false,
          autoApprovalRules: data.autoApprovalRules ?? [],
          escalationEnabled: data.escalationEnabled ?? false,
          escalationHours: data.escalationHours ?? null,
          halfDayEnabled: data.halfDayEnabled ?? true,
          backdatedLeaveDays: data.backdatedLeaveDays ?? 0,
          minDaysBeforeRequest: data.minDaysBeforeRequest ?? 0,
          negativeBalanceAllowed: data.negativeBalanceAllowed ?? false,
          maxNegativeBalanceDays: data.maxNegativeBalanceDays ?? null,
          yearEndProcessing: data.yearEndProcessing ?? {},
          compOffEarningRules: data.compOffEarningRules ?? {},
          compOffExpiryDays: data.compOffExpiryDays ?? null,
          encashmentRules: data.encashmentRules ?? {},
          isDefault: true,
          isActive: true,
        })
        .returning();

      return this.toDto(created);
    }
  }

  private toDto(row: typeof schema.leavePolicies.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      leaveYearStart: row.leaveYearStart,
      customYearStartMonth: row.customYearStartMonth,
      customYearStartDay: row.customYearStartDay,
      sandwichRuleEnabled: row.sandwichRuleEnabled,
      sandwichRuleType: row.sandwichRuleType,
      autoApprovalEnabled: row.autoApprovalEnabled,
      autoApprovalRules: row.autoApprovalRules,
      escalationEnabled: row.escalationEnabled,
      escalationHours: row.escalationHours,
      halfDayEnabled: row.halfDayEnabled,
      backdatedLeaveDays: row.backdatedLeaveDays,
      minDaysBeforeRequest: row.minDaysBeforeRequest,
      negativeBalanceAllowed: row.negativeBalanceAllowed,
      maxNegativeBalanceDays: row.maxNegativeBalanceDays,
      yearEndProcessing: row.yearEndProcessing,
      compOffEarningRules: row.compOffEarningRules,
      compOffExpiryDays: row.compOffExpiryDays,
      encashmentRules: row.encashmentRules,
      isDefault: row.isDefault,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
