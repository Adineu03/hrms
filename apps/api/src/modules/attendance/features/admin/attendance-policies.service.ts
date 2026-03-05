import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class AttendancePoliciesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getPolicy(orgId: string) {
    const [row] = await this.db
      .select()
      .from(schema.attendancePolicies)
      .where(
        and(
          eq(schema.attendancePolicies.orgId, orgId),
          eq(schema.attendancePolicies.isDefault, true),
        ),
      )
      .limit(1);

    if (!row) {
      return { data: null, message: 'No attendance policy configured yet' };
    }

    return this.toDto(row);
  }

  async upsertPolicy(orgId: string, data: Record<string, any>) {
    const now = new Date();

    // Check if a default policy already exists for this org
    const [existing] = await this.db
      .select()
      .from(schema.attendancePolicies)
      .where(
        and(
          eq(schema.attendancePolicies.orgId, orgId),
          eq(schema.attendancePolicies.isDefault, true),
        ),
      )
      .limit(1);

    if (existing) {
      // Update the existing policy
      const updates: Record<string, any> = { updatedAt: now };
      const allowedFields = [
        'name', 'trackingMethods', 'graceMinutesLate', 'graceMinutesEarly',
        'halfDayThresholdMinutes', 'fullDayThresholdMinutes', 'lateMarkRules',
        'overtimeEnabled', 'overtimeRates', 'maxOvertimePerDay',
        'maxOvertimePerWeek', 'maxOvertimePerMonth', 'overtimeApprovalType',
        'compOffConversionRules', 'regularizationDeadlineDays',
        'regularizationApprovalRequired', 'autoClockOut', 'autoClockOutTime',
        'geoFenceEnabled', 'wifiValidationEnabled', 'allowedWifiNetworks',
        'payrollCutoffDay', 'lockAfterPayroll',
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) updates[field] = data[field];
      }

      const [updated] = await this.db
        .update(schema.attendancePolicies)
        .set(updates)
        .where(
          and(
            eq(schema.attendancePolicies.id, existing.id),
            eq(schema.attendancePolicies.orgId, orgId),
          ),
        )
        .returning();

      return this.toDto(updated);
    } else {
      // Create a new default policy
      const [created] = await this.db
        .insert(schema.attendancePolicies)
        .values({
          orgId,
          name: data.name ?? 'Default Policy',
          trackingMethods: data.trackingMethods ?? ['web'],
          graceMinutesLate: data.graceMinutesLate ?? 15,
          graceMinutesEarly: data.graceMinutesEarly ?? 15,
          halfDayThresholdMinutes: data.halfDayThresholdMinutes ?? 240,
          fullDayThresholdMinutes: data.fullDayThresholdMinutes ?? 480,
          lateMarkRules: data.lateMarkRules ?? {},
          overtimeEnabled: data.overtimeEnabled ?? false,
          overtimeRates: data.overtimeRates ?? {},
          maxOvertimePerDay: data.maxOvertimePerDay ?? 4,
          maxOvertimePerWeek: data.maxOvertimePerWeek ?? 20,
          maxOvertimePerMonth: data.maxOvertimePerMonth ?? 60,
          overtimeApprovalType: data.overtimeApprovalType ?? 'pre_approval',
          compOffConversionRules: data.compOffConversionRules ?? {},
          regularizationDeadlineDays: data.regularizationDeadlineDays ?? 7,
          regularizationApprovalRequired: data.regularizationApprovalRequired ?? true,
          autoClockOut: data.autoClockOut ?? true,
          autoClockOutTime: data.autoClockOutTime ?? '21:00',
          geoFenceEnabled: data.geoFenceEnabled ?? false,
          wifiValidationEnabled: data.wifiValidationEnabled ?? false,
          allowedWifiNetworks: data.allowedWifiNetworks ?? [],
          payrollCutoffDay: data.payrollCutoffDay ?? 25,
          lockAfterPayroll: data.lockAfterPayroll ?? true,
          isDefault: true,
          isActive: true,
        })
        .returning();

      return this.toDto(created);
    }
  }

  private toDto(row: typeof schema.attendancePolicies.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      trackingMethods: row.trackingMethods,
      graceMinutesLate: row.graceMinutesLate,
      graceMinutesEarly: row.graceMinutesEarly,
      halfDayThresholdMinutes: row.halfDayThresholdMinutes,
      fullDayThresholdMinutes: row.fullDayThresholdMinutes,
      lateMarkRules: row.lateMarkRules,
      overtimeEnabled: row.overtimeEnabled,
      overtimeRates: row.overtimeRates,
      maxOvertimePerDay: row.maxOvertimePerDay,
      maxOvertimePerWeek: row.maxOvertimePerWeek,
      maxOvertimePerMonth: row.maxOvertimePerMonth,
      overtimeApprovalType: row.overtimeApprovalType,
      compOffConversionRules: row.compOffConversionRules,
      regularizationDeadlineDays: row.regularizationDeadlineDays,
      regularizationApprovalRequired: row.regularizationApprovalRequired,
      autoClockOut: row.autoClockOut,
      autoClockOutTime: row.autoClockOutTime,
      geoFenceEnabled: row.geoFenceEnabled,
      wifiValidationEnabled: row.wifiValidationEnabled,
      allowedWifiNetworks: row.allowedWifiNetworks,
      payrollCutoffDay: row.payrollCutoffDay,
      lockAfterPayroll: row.lockAfterPayroll,
      isDefault: row.isDefault,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
