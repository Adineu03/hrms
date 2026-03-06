import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CompliancePolicyMgmtService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getAcknowledgements(
    orgId: string,
    filters: { employeeId?: string; page?: number; limit?: number },
  ) {
    // Get compliance-type tasks (policy acknowledgements) from onboarding tasks
    const conditions: any[] = [
      eq(schema.employeeOnboardingTasks.orgId, orgId),
      eq(schema.employeeOnboardingTasks.isActive, true),
      eq(schema.employeeOnboardingTasks.taskType, 'compliance'),
    ];

    if (filters.employeeId) {
      conditions.push(eq(schema.employeeOnboardingTasks.employeeId, filters.employeeId));
    }

    const rows = await this.db
      .select({
        task: schema.employeeOnboardingTasks,
        employee: schema.users,
      })
      .from(schema.employeeOnboardingTasks)
      .leftJoin(schema.users, eq(schema.employeeOnboardingTasks.employeeId, schema.users.id))
      .where(and(...conditions))
      .orderBy(desc(schema.employeeOnboardingTasks.createdAt));

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const paginated = rows.slice(offset, offset + limit);

    return {
      data: paginated.map((r) => ({
        id: r.task.id,
        employeeId: r.task.employeeId,
        employeeName: r.employee
          ? `${r.employee.firstName} ${r.employee.lastName ?? ''}`.trim()
          : null,
        title: r.task.title,
        description: r.task.description,
        status: r.task.status,
        dueDate: r.task.dueDate,
        completedAt: r.task.completedAt?.toISOString() ?? null,
        verificationStatus: r.task.verificationStatus,
        verifiedBy: r.task.verifiedBy,
        verifiedAt: r.task.verifiedAt?.toISOString() ?? null,
        metadata: r.task.metadata,
        createdAt: r.task.createdAt.toISOString(),
      })),
      meta: {
        total: rows.length,
        page,
        limit,
        totalPages: Math.ceil(rows.length / limit),
      },
    };
  }

  async getTrainingCompletion(orgId: string, filters: { departmentId?: string }) {
    // Training-type tasks from onboarding tasks
    let departmentFilter = sql`true`;
    if (filters.departmentId) {
      departmentFilter = sql`ep.department_id = ${filters.departmentId}`;
    }

    const rows = await this.db.execute(sql`
      SELECT
        eot.title AS training_name,
        eot.task_type,
        COUNT(eot.id)::int AS total_assigned,
        COUNT(CASE WHEN eot.status = 'completed' THEN 1 END)::int AS completed,
        COUNT(CASE WHEN eot.status = 'pending' THEN 1 END)::int AS pending,
        COUNT(CASE WHEN eot.status = 'overdue' THEN 1 END)::int AS overdue,
        CASE
          WHEN COUNT(eot.id) > 0
          THEN ROUND(COUNT(CASE WHEN eot.status = 'completed' THEN 1 END)::numeric / COUNT(eot.id) * 100, 2)
          ELSE 0
        END AS completion_rate
      FROM employee_onboarding_tasks eot
      LEFT JOIN users u ON eot.employee_id = u.id
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      WHERE eot.org_id = ${orgId}
        AND eot.is_active = true
        AND eot.task_type = 'training'
        AND ${departmentFilter}
      GROUP BY eot.title, eot.task_type
      ORDER BY completion_rate ASC
    `);

    // Summary
    const [summary] = await this.db.execute(sql`
      SELECT
        COUNT(*)::int AS total_training_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END)::int AS overdue,
        CASE
          WHEN COUNT(*) > 0
          THEN ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / COUNT(*) * 100, 2)
          ELSE 0
        END AS overall_completion_rate
      FROM employee_onboarding_tasks
      WHERE org_id = ${orgId}
        AND is_active = true
        AND task_type = 'training'
    `);

    return {
      summary: summary ?? {},
      byTraining: rows,
    };
  }

  async getRegulatoryChecklist(orgId: string, filters: { jurisdiction?: string }) {
    // Compliance tasks grouped by category from workflow tasks
    const rows = await this.db.execute(sql`
      SELECT
        owt.title,
        owt.task_type,
        owt.is_mandatory,
        owt.document_required,
        owt.document_type,
        COUNT(DISTINCT eot.id)::int AS times_assigned,
        COUNT(DISTINCT CASE WHEN eot.status = 'completed' THEN eot.id END)::int AS times_completed,
        CASE
          WHEN COUNT(DISTINCT eot.id) > 0
          THEN ROUND(COUNT(DISTINCT CASE WHEN eot.status = 'completed' THEN eot.id END)::numeric / COUNT(DISTINCT eot.id) * 100, 2)
          ELSE 0
        END AS compliance_rate
      FROM onboarding_workflow_tasks owt
      LEFT JOIN employee_onboarding_tasks eot ON owt.id = eot.workflow_task_id AND eot.is_active = true
      WHERE owt.org_id = ${orgId}
        AND owt.is_active = true
        AND owt.task_type IN ('compliance', 'document_submission', 'training')
      GROUP BY owt.id, owt.title, owt.task_type, owt.is_mandatory, owt.document_required, owt.document_type
      ORDER BY compliance_rate ASC
    `);

    return { data: rows };
  }

  async getAuditTrail(
    orgId: string,
    filters: { entityType?: string; page?: number; limit?: number },
  ) {
    // Audit trail from onboarding and offboarding activity
    const conditions: any[] = [
      eq(schema.auditLogs.orgId, orgId),
    ];

    if (filters.entityType) {
      conditions.push(eq(schema.auditLogs.entity, filters.entityType));
    } else {
      // Filter to onboarding/offboarding related entities
      conditions.push(
        sql`${schema.auditLogs.entity} IN ('employee_onboarding', 'employee_offboarding', 'onboarding_workflow', 'offboarding_workflow', 'exit_interview', 'knowledge_transfer')`,
      );
    }

    const rows = await this.db
      .select({
        log: schema.auditLogs,
        user: schema.users,
      })
      .from(schema.auditLogs)
      .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
      .where(and(...conditions))
      .orderBy(desc(schema.auditLogs.createdAt));

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const offset = (page - 1) * limit;
    const paginated = rows.slice(offset, offset + limit);

    return {
      data: paginated.map((r) => ({
        id: r.log.id,
        entity: r.log.entity,
        entityId: r.log.entityId,
        action: r.log.action,
        userId: r.log.userId,
        userName: r.user
          ? `${r.user.firstName} ${r.user.lastName ?? ''}`.trim()
          : null,
        description: r.log.description,
        oldValue: r.log.oldValue,
        newValue: r.log.newValue,
        ipAddress: r.log.ipAddress,
        createdAt: r.log.createdAt.toISOString(),
      })),
      meta: {
        total: rows.length,
        page,
        limit,
        totalPages: Math.ceil(rows.length / limit),
      },
    };
  }

  async getDataRetention(orgId: string) {
    // Data retention metrics for exited employees
    const [retentionStats] = await this.db.execute(sql`
      SELECT
        COUNT(*)::int AS total_exited,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS fully_processed,
        COUNT(CASE WHEN relieving_letter_url IS NOT NULL THEN 1 END)::int AS relieving_letters_issued,
        COUNT(CASE WHEN experience_letter_url IS NOT NULL THEN 1 END)::int AS experience_letters_issued,
        COUNT(CASE WHEN settlement_status = 'completed' THEN 1 END)::int AS settlements_completed,
        COUNT(CASE WHEN handover_status = 'completed' THEN 1 END)::int AS handovers_completed
      FROM employee_offboardings
      WHERE org_id = ${orgId} AND is_active = true
    `);

    // Knowledge transfer completion stats
    const [ktStats] = await this.db.execute(sql`
      SELECT
        COUNT(*)::int AS total_transfers,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed_transfers,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending_transfers,
        COUNT(CASE WHEN approved_by IS NOT NULL THEN 1 END)::int AS approved_transfers
      FROM knowledge_transfers
      WHERE org_id = ${orgId} AND is_active = true
    `);

    return {
      exitedEmployees: retentionStats ?? {},
      knowledgeTransfers: ktStats ?? {},
    };
  }

  async createPolicy(orgId: string, data: Record<string, any>) {
    if (!data.name) throw new BadRequestException('Policy name is required');

    // Store compliance policies as onboarding workflow tasks with type 'compliance'
    // Create a system-level compliance workflow if needed
    let [complianceWorkflow] = await this.db
      .select()
      .from(schema.onboardingWorkflows)
      .where(
        and(
          eq(schema.onboardingWorkflows.orgId, orgId),
          eq(schema.onboardingWorkflows.workflowType, 'onboarding'),
          sql`${schema.onboardingWorkflows.metadata}->>'isComplianceWorkflow' = 'true'`,
        ),
      )
      .limit(1);

    if (!complianceWorkflow) {
      [complianceWorkflow] = await this.db
        .insert(schema.onboardingWorkflows)
        .values({
          orgId,
          name: 'Compliance Policies',
          description: 'System compliance policy workflow',
          workflowType: 'onboarding',
          isTemplate: true,
          status: 'active',
          createdBy: data.createdBy ?? orgId,
          metadata: { isComplianceWorkflow: true },
        })
        .returning();
    }

    const [task] = await this.db
      .insert(schema.onboardingWorkflowTasks)
      .values({
        orgId,
        workflowId: complianceWorkflow.id,
        title: data.name,
        description: data.description ?? null,
        taskType: 'compliance',
        taskOwner: data.taskOwner ?? 'hr',
        sortOrder: data.sortOrder ?? 0,
        deadlineDays: data.deadlineDays ?? 30,
        isMandatory: data.isMandatory ?? true,
        documentRequired: data.documentRequired ?? false,
        documentType: data.documentType ?? null,
        metadata: {
          policyType: data.policyType ?? 'general',
          jurisdiction: data.jurisdiction ?? null,
          effectiveDate: data.effectiveDate ?? null,
          reviewDate: data.reviewDate ?? null,
          ...(data.metadata ?? {}),
        },
      })
      .returning();

    // Update task count
    await this.db
      .update(schema.onboardingWorkflows)
      .set({
        taskCount: sql`${schema.onboardingWorkflows.taskCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.onboardingWorkflows.id, complianceWorkflow.id));

    return task;
  }

  async updatePolicy(orgId: string, taskId: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.onboardingWorkflowTasks)
      .where(
        and(
          eq(schema.onboardingWorkflowTasks.id, taskId),
          eq(schema.onboardingWorkflowTasks.orgId, orgId),
          eq(schema.onboardingWorkflowTasks.taskType, 'compliance'),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Compliance policy not found');

    const updates: Record<string, any> = { updatedAt: new Date() };
    const allowedFields = [
      'title', 'description', 'taskOwner', 'sortOrder', 'deadlineDays',
      'isMandatory', 'documentRequired', 'documentType',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        // Map 'title' from data.name if provided
        updates[field === 'title' && data.name !== undefined ? 'title' : field] =
          field === 'title' && data.name !== undefined ? data.name : data[field];
      }
    }
    if (data.name !== undefined) updates.title = data.name;

    // Update metadata fields
    if (data.policyType || data.jurisdiction || data.effectiveDate || data.reviewDate || data.metadata) {
      const existingMeta = (existing.metadata as Record<string, any>) ?? {};
      updates.metadata = {
        ...existingMeta,
        ...(data.policyType !== undefined && { policyType: data.policyType }),
        ...(data.jurisdiction !== undefined && { jurisdiction: data.jurisdiction }),
        ...(data.effectiveDate !== undefined && { effectiveDate: data.effectiveDate }),
        ...(data.reviewDate !== undefined && { reviewDate: data.reviewDate }),
        ...(data.metadata ?? {}),
      };
    }

    await this.db
      .update(schema.onboardingWorkflowTasks)
      .set(updates)
      .where(
        and(
          eq(schema.onboardingWorkflowTasks.id, taskId),
          eq(schema.onboardingWorkflowTasks.orgId, orgId),
        ),
      );

    const [updated] = await this.db
      .select()
      .from(schema.onboardingWorkflowTasks)
      .where(eq(schema.onboardingWorkflowTasks.id, taskId))
      .limit(1);

    return updated;
  }
}
