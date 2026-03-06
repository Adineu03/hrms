import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ApprovalWorkflowsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getWorkflowConfig(orgId: string) {
    const [policy] = await this.db
      .select()
      .from(schema.timesheetPolicies)
      .where(
        and(
          eq(schema.timesheetPolicies.orgId, orgId),
          eq(schema.timesheetPolicies.isDefault, true),
        ),
      )
      .limit(1);

    if (!policy) {
      return {
        data: null,
        message: 'No timesheet policy configured yet. Configure a policy first.',
      };
    }

    return {
      policyId: policy.id,
      approvalLevels: policy.approvalLevels,
      autoApprovalEnabled: policy.autoApprovalEnabled,
      autoApprovalRules: policy.autoApprovalRules,
      escalationEnabled: policy.escalationEnabled,
      escalationHours: policy.escalationHours,
      delegationRules: policy.delegationRules,
      updatedAt: policy.updatedAt.toISOString(),
    };
  }

  async updateWorkflowConfig(orgId: string, data: Record<string, any>) {
    const [policy] = await this.db
      .select()
      .from(schema.timesheetPolicies)
      .where(
        and(
          eq(schema.timesheetPolicies.orgId, orgId),
          eq(schema.timesheetPolicies.isDefault, true),
        ),
      )
      .limit(1);

    if (!policy) {
      throw new NotFoundException(
        'No timesheet policy found. Please configure a timesheet policy first.',
      );
    }

    const now = new Date();
    const updates: Record<string, any> = { updatedAt: now };

    if (data.approvalLevels !== undefined) {
      updates.approvalLevels = data.approvalLevels;
    }
    if (data.autoApprovalEnabled !== undefined) {
      updates.autoApprovalEnabled = data.autoApprovalEnabled;
    }
    if (data.autoApprovalRules !== undefined) {
      updates.autoApprovalRules = data.autoApprovalRules;
    }
    if (data.escalationEnabled !== undefined) {
      updates.escalationEnabled = data.escalationEnabled;
    }
    if (data.escalationHours !== undefined) {
      updates.escalationHours = data.escalationHours;
    }
    if (data.delegationRules !== undefined) {
      updates.delegationRules = data.delegationRules;
    }

    const [updated] = await this.db
      .update(schema.timesheetPolicies)
      .set(updates)
      .where(
        and(
          eq(schema.timesheetPolicies.id, policy.id),
          eq(schema.timesheetPolicies.orgId, orgId),
        ),
      )
      .returning();

    return {
      policyId: updated.id,
      approvalLevels: updated.approvalLevels,
      autoApprovalEnabled: updated.autoApprovalEnabled,
      autoApprovalRules: updated.autoApprovalRules,
      escalationEnabled: updated.escalationEnabled,
      escalationHours: updated.escalationHours,
      delegationRules: updated.delegationRules,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async listPendingSubmissions(orgId: string) {
    const rows = await this.db
      .select({
        submission: schema.timesheetSubmissions,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
        employeeEmail: schema.users.email,
        departmentId: schema.employeeProfiles.departmentId,
      })
      .from(schema.timesheetSubmissions)
      .leftJoin(
        schema.users,
        and(
          eq(schema.timesheetSubmissions.employeeId, schema.users.id),
          eq(schema.timesheetSubmissions.orgId, schema.users.orgId),
        ),
      )
      .leftJoin(
        schema.employeeProfiles,
        and(
          eq(schema.timesheetSubmissions.employeeId, schema.employeeProfiles.userId),
          eq(schema.timesheetSubmissions.orgId, schema.employeeProfiles.orgId),
        ),
      )
      .where(
        and(
          eq(schema.timesheetSubmissions.orgId, orgId),
          eq(schema.timesheetSubmissions.status, 'submitted'),
        ),
      )
      .orderBy(desc(schema.timesheetSubmissions.submittedAt));

    return rows.map((r) => ({
      id: r.submission.id,
      employeeId: r.submission.employeeId,
      employee: {
        id: r.submission.employeeId,
        firstName: r.employeeFirstName,
        lastName: r.employeeLastName,
        email: r.employeeEmail,
      },
      departmentId: r.departmentId,
      periodStart: r.submission.periodStart,
      periodEnd: r.submission.periodEnd,
      totalHours: r.submission.totalHours,
      billableHours: r.submission.billableHours,
      nonBillableHours: r.submission.nonBillableHours,
      status: r.submission.status,
      summaryNote: r.submission.summaryNote,
      approvalChain: r.submission.approvalChain,
      currentApproverLevel: r.submission.currentApproverLevel,
      submittedAt: r.submission.submittedAt?.toISOString() ?? null,
      createdAt: r.submission.createdAt.toISOString(),
    }));
  }
}
