import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { buildUserNameMap } from '../../../../shared/database/user-names.util';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEVERITIES = ['minor', 'major', 'gross'] as const;

type ViolationRow = typeof schema.policyViolations.$inferSelect;

@Injectable()
export class PolicyViolationTrackingService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  /** Resolve the manager's direct reports by employeeProfiles.managerId === userId. */
  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: schema.users.id })
      .from(schema.users)
      .innerJoin(schema.employeeProfiles, eq(schema.users.id, schema.employeeProfiles.userId))
      .where(and(eq(schema.users.orgId, orgId), eq(schema.employeeProfiles.managerId, managerId)));
    return rows.map((r) => r.userId);
  }

  private async getPolicyTitleMap(orgId: string): Promise<Map<string, string>> {
    const rows = await this.db
      .select({ id: schema.compliancePolicies.id, title: schema.compliancePolicies.title })
      .from(schema.compliancePolicies)
      .where(eq(schema.compliancePolicies.orgId, orgId));
    return new Map(rows.map((r) => [r.id, r.title]));
  }

  /** Shape a DB row into what the manager tab renders. */
  private toViolationDto(
    row: ViolationRow,
    nameMap: Map<string, string>,
    policyTitleMap: Map<string, string>,
  ) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeName: nameMap.get(row.employeeId) ?? 'Unknown',
      policyId: row.policyId,
      policyTitle: row.policyId ? (policyTitleMap.get(row.policyId) ?? null) : null,
      violationType: row.violationType,
      description: row.description ?? '',
      severity: row.severity,
      date: row.incidentDate ?? row.createdAt,
      status: row.status,
      disciplinaryActionStatus: row.status,
      disciplinaryAction: row.disciplinaryAction,
      reportedBy: row.reportedBy,
      resolvedAt: row.resolvedAt,
    };
  }

  async listViolations(orgId: string, userId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, userId);
    if (teamIds.length === 0) return { data: [], meta: { total: 0 } };

    const rows = await this.db
      .select()
      .from(schema.policyViolations)
      .where(
        and(
          eq(schema.policyViolations.orgId, orgId),
          eq(schema.policyViolations.isActive, true),
          inArray(schema.policyViolations.employeeId, teamIds),
        ),
      )
      .orderBy(desc(schema.policyViolations.createdAt));

    const [nameMap, policyTitleMap] = await Promise.all([
      buildUserNameMap(this.db, rows.map((r) => r.employeeId)),
      this.getPolicyTitleMap(orgId),
    ]);

    const data = rows.map((r) => this.toViolationDto(r, nameMap, policyTitleMap));
    return { data, meta: { total: data.length } };
  }

  async createViolation(
    orgId: string,
    userId: string,
    dto: {
      employeeId: string;
      policyId?: string;
      violationType: string;
      description?: string;
      severity?: string;
    },
  ) {
    if (!dto.employeeId || !UUID_RE.test(dto.employeeId)) {
      throw new BadRequestException('A valid employee is required');
    }
    if (!dto.violationType?.trim()) {
      throw new BadRequestException('Violation type is required');
    }

    // Ensure the employee belongs to this org (cross-org guard).
    const [employee] = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(eq(schema.users.id, dto.employeeId), eq(schema.users.orgId, orgId)));
    if (!employee) throw new NotFoundException('Employee not found in your organization');

    // Optional policy link — silently drop invalid/foreign ids instead of failing the insert.
    let policyId: string | null = null;
    if (dto.policyId && UUID_RE.test(dto.policyId)) {
      const [policy] = await this.db
        .select({ id: schema.compliancePolicies.id })
        .from(schema.compliancePolicies)
        .where(and(eq(schema.compliancePolicies.id, dto.policyId), eq(schema.compliancePolicies.orgId, orgId)));
      policyId = policy?.id ?? null;
    }

    const severity = SEVERITIES.includes(dto.severity as (typeof SEVERITIES)[number])
      ? (dto.severity as (typeof SEVERITIES)[number])
      : 'minor';

    const [row] = await this.db
      .insert(schema.policyViolations)
      .values({
        orgId,
        employeeId: dto.employeeId,
        policyId,
        violationType: dto.violationType.trim(),
        severity,
        description: dto.description?.trim() || null,
        incidentDate: new Date().toISOString().slice(0, 10),
        status: 'open',
        reportedBy: userId,
      })
      .returning();

    const [nameMap, policyTitleMap] = await Promise.all([
      buildUserNameMap(this.db, [row.employeeId]),
      this.getPolicyTitleMap(orgId),
    ]);
    return { data: this.toViolationDto(row, nameMap, policyTitleMap) };
  }

  async recordDisciplinaryAction(orgId: string, userId: string, id: string, dto: { action: string; notes?: string }) {
    if (!dto.action?.trim()) throw new BadRequestException('Action is required');

    const [existing] = await this.db
      .select()
      .from(schema.policyViolations)
      .where(
        and(
          eq(schema.policyViolations.id, id),
          eq(schema.policyViolations.orgId, orgId),
          eq(schema.policyViolations.isActive, true),
        ),
      );
    if (!existing) throw new NotFoundException('Policy violation record not found');

    const actionText = dto.notes ? `${dto.action.trim()} — ${dto.notes.trim()}` : dto.action.trim();

    const [row] = await this.db
      .update(schema.policyViolations)
      .set({
        status: 'action_taken',
        disciplinaryAction: actionText,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.policyViolations.id, id), eq(schema.policyViolations.orgId, orgId)))
      .returning();

    const [nameMap, policyTitleMap] = await Promise.all([
      buildUserNameMap(this.db, [row.employeeId]),
      this.getPolicyTitleMap(orgId),
    ]);
    return { data: this.toViolationDto(row, nameMap, policyTitleMap) };
  }

  async getViolationHistory(orgId: string, userId: string, employeeId: string) {
    if (!UUID_RE.test(employeeId)) throw new BadRequestException('Invalid employee id');

    const rows = await this.db
      .select()
      .from(schema.policyViolations)
      .where(
        and(
          eq(schema.policyViolations.orgId, orgId),
          eq(schema.policyViolations.employeeId, employeeId),
          eq(schema.policyViolations.isActive, true),
        ),
      )
      .orderBy(desc(schema.policyViolations.createdAt));

    const [nameMap, policyTitleMap] = await Promise.all([
      buildUserNameMap(this.db, [employeeId]),
      this.getPolicyTitleMap(orgId),
    ]);

    return {
      data: {
        employeeId,
        employeeName: nameMap.get(employeeId) ?? 'Unknown',
        violations: rows.map((r) => this.toViolationDto(r, nameMap, policyTitleMap)),
      },
      meta: { total: rows.length, employeeId },
    };
  }
}
