import { Inject, Injectable } from '@nestjs/common';
import { eq, and, ne, inArray, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

/**
 * Lightweight roster lookups shared by the manager onboarding/offboarding tabs
 * (Buddy Assignment, Knowledge Transfer, Exit Interviews). Each endpoint is
 * scoped to the manager's direct reports (employee_profiles.manager_id) and the
 * caller's org.
 */
@Injectable()
export class TeamRosterService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const members = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
    return members.map((m) => m.userId);
  }

  private fullName(firstName: string | null, lastName: string | null): string {
    return [firstName, lastName].filter(Boolean).join(' ').trim();
  }

  // ── Team members (active direct reports) ────────────────────────────
  async listTeamMembers(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], total: 0 };

    const rows = await this.db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        role: schema.users.role,
        departmentName: schema.departments.name,
      })
      .from(schema.users)
      .leftJoin(
        schema.employeeProfiles,
        eq(schema.employeeProfiles.userId, schema.users.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.departments.id, schema.employeeProfiles.departmentId),
      )
      .where(
        and(
          eq(schema.users.orgId, orgId),
          eq(schema.users.isActive, true),
          inArray(schema.users.id, teamIds),
        ),
      )
      .orderBy(schema.users.firstName);

    const data = rows.map((r) => ({
      id: r.id,
      name: this.fullName(r.firstName, r.lastName),
      email: r.email,
      role: r.role,
      department: r.departmentName ?? null,
    }));
    return { data, total: data.length };
  }

  // ── New hires (team members with an active onboarding still in progress) ──
  async listNewHires(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], total: 0 };

    const rows = await this.db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        onboardingId: schema.employeeOnboardings.id,
        status: schema.employeeOnboardings.status,
        startDate: schema.employeeOnboardings.startDate,
        progressPercentage: schema.employeeOnboardings.progressPercentage,
        departmentName: schema.departments.name,
      })
      .from(schema.employeeOnboardings)
      .innerJoin(
        schema.users,
        eq(schema.employeeOnboardings.employeeId, schema.users.id),
      )
      .leftJoin(
        schema.employeeProfiles,
        eq(schema.employeeProfiles.userId, schema.users.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.departments.id, schema.employeeProfiles.departmentId),
      )
      .where(
        and(
          eq(schema.employeeOnboardings.orgId, orgId),
          eq(schema.employeeOnboardings.isActive, true),
          ne(schema.employeeOnboardings.status, 'completed'),
          inArray(schema.employeeOnboardings.employeeId, teamIds),
        ),
      )
      .orderBy(desc(schema.employeeOnboardings.createdAt));

    const data = rows.map((r) => ({
      id: r.id,
      name: this.fullName(r.firstName, r.lastName),
      email: r.email,
      onboardingId: r.onboardingId,
      status: r.status,
      startDate: r.startDate,
      progressPercentage: r.progressPercentage ? Number(r.progressPercentage) : 0,
      department: r.departmentName ?? null,
    }));
    return { data, total: data.length };
  }

  // ── Departing employees (team members with an active offboarding) ───
  async listDepartingEmployees(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], total: 0 };

    const rows = await this.db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        offboardingId: schema.employeeOffboardings.id,
        exitType: schema.employeeOffboardings.exitType,
        lastWorkingDate: schema.employeeOffboardings.lastWorkingDate,
        status: schema.employeeOffboardings.status,
        departmentName: schema.departments.name,
      })
      .from(schema.employeeOffboardings)
      .innerJoin(
        schema.users,
        eq(schema.employeeOffboardings.employeeId, schema.users.id),
      )
      .leftJoin(
        schema.employeeProfiles,
        eq(schema.employeeProfiles.userId, schema.users.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.departments.id, schema.employeeProfiles.departmentId),
      )
      .where(
        and(
          eq(schema.employeeOffboardings.orgId, orgId),
          eq(schema.employeeOffboardings.isActive, true),
          ne(schema.employeeOffboardings.status, 'completed'),
          inArray(schema.employeeOffboardings.employeeId, teamIds),
        ),
      )
      .orderBy(desc(schema.employeeOffboardings.createdAt));

    const data = rows.map((r) => ({
      id: r.id,
      name: this.fullName(r.firstName, r.lastName),
      email: r.email,
      department: r.departmentName ?? null,
      offboardingId: r.offboardingId,
      exitType: r.exitType,
      lastWorkingDate: r.lastWorkingDate,
      status: r.status,
    }));
    return { data, total: data.length };
  }
}
