import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { departments } from '../../../../infrastructure/database/schema/departments';
import { designations } from '../../../../infrastructure/database/schema/designations';
import { locations } from '../../../../infrastructure/database/schema/locations';
import { grades } from '../../../../infrastructure/database/schema/grades';

interface TeamFilters {
  location?: string;
  grade?: string;
  employmentType?: string;
  tenureMin?: number;
  tenureMax?: number;
}

@Injectable()
export class TeamDirectoryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getTeam(orgId: string, managerId: string, filters: TeamFilters) {
    const conditions = [
      eq(employeeProfiles.managerId, managerId),
      eq(users.orgId, orgId),
    ];

    if (filters.location) {
      conditions.push(eq(employeeProfiles.locationId, filters.location));
    }
    if (filters.grade) {
      conditions.push(eq(employeeProfiles.gradeId, filters.grade));
    }
    if (filters.employmentType) {
      conditions.push(eq(employeeProfiles.employmentType, filters.employmentType));
    }

    let query = this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        employeeId: employeeProfiles.employeeId,
        departmentName: departments.name,
        designationName: designations.name,
        locationName: locations.name,
        gradeName: grades.name,
        dateOfJoining: employeeProfiles.dateOfJoining,
        employmentType: employeeProfiles.employmentType,
        workModel: employeeProfiles.workModel,
        phone: employeeProfiles.phone,
        profilePhotoUrl: employeeProfiles.profilePhotoUrl,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .leftJoin(departments, eq(employeeProfiles.departmentId, departments.id))
      .leftJoin(designations, eq(employeeProfiles.designationId, designations.id))
      .leftJoin(locations, eq(employeeProfiles.locationId, locations.id))
      .leftJoin(grades, eq(employeeProfiles.gradeId, grades.id))
      .where(and(...conditions));

    const rows = await query;

    // Apply tenure filters in application layer (date math)
    let results = rows;
    if (filters.tenureMin !== undefined || filters.tenureMax !== undefined) {
      const now = new Date();
      results = rows.filter((r) => {
        if (!r.dateOfJoining) return false;
        const joinDate = new Date(r.dateOfJoining);
        const tenureMonths =
          (now.getFullYear() - joinDate.getFullYear()) * 12 +
          (now.getMonth() - joinDate.getMonth());
        if (filters.tenureMin !== undefined && tenureMonths < filters.tenureMin) return false;
        if (filters.tenureMax !== undefined && tenureMonths > filters.tenureMax) return false;
        return true;
      });
    }

    return { data: results, total: results.length };
  }

  async getTeamMember(orgId: string, managerId: string, userId: string) {
    const [result] = await this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        employeeId: employeeProfiles.employeeId,
        departmentId: employeeProfiles.departmentId,
        departmentName: departments.name,
        designationId: employeeProfiles.designationId,
        designationName: designations.name,
        locationId: employeeProfiles.locationId,
        locationName: locations.name,
        gradeId: employeeProfiles.gradeId,
        gradeName: grades.name,
        dateOfBirth: employeeProfiles.dateOfBirth,
        gender: employeeProfiles.gender,
        phone: employeeProfiles.phone,
        personalEmail: employeeProfiles.personalEmail,
        dateOfJoining: employeeProfiles.dateOfJoining,
        probationEndDate: employeeProfiles.probationEndDate,
        employmentType: employeeProfiles.employmentType,
        workModel: employeeProfiles.workModel,
        profilePhotoUrl: employeeProfiles.profilePhotoUrl,
        emergencyContacts: employeeProfiles.emergencyContacts,
        address: employeeProfiles.address,
        onboardingStatus: employeeProfiles.onboardingStatus,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .leftJoin(departments, eq(employeeProfiles.departmentId, departments.id))
      .leftJoin(designations, eq(employeeProfiles.designationId, designations.id))
      .leftJoin(locations, eq(employeeProfiles.locationId, locations.id))
      .leftJoin(grades, eq(employeeProfiles.gradeId, grades.id))
      .where(
        and(
          eq(users.id, userId),
          eq(users.orgId, orgId),
          eq(employeeProfiles.managerId, managerId),
        ),
      )
      .limit(1);

    if (!result) {
      throw new NotFoundException('Team member not found or not in your team');
    }

    return result;
  }

  async getTeamStats(orgId: string, managerId: string) {
    const team = await this.db
      .select({
        locationName: locations.name,
        gradeName: grades.name,
        employmentType: employeeProfiles.employmentType,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .leftJoin(locations, eq(employeeProfiles.locationId, locations.id))
      .leftJoin(grades, eq(employeeProfiles.gradeId, grades.id))
      .where(
        and(
          eq(employeeProfiles.managerId, managerId),
          eq(users.orgId, orgId),
        ),
      );

    const byLocation: Record<string, number> = {};
    const byGrade: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const member of team) {
      const loc = member.locationName ?? 'Unassigned';
      byLocation[loc] = (byLocation[loc] ?? 0) + 1;
      const grade = member.gradeName ?? 'Unassigned';
      byGrade[grade] = (byGrade[grade] ?? 0) + 1;
      const type = member.employmentType ?? 'Unassigned';
      byType[type] = (byType[type] ?? 0) + 1;
    }

    return {
      teamSize: team.length,
      byLocation,
      byGrade,
      byEmploymentType: byType,
    };
  }

  async getTeamHistory(orgId: string, managerId: string) {
    const rows = await this.db
      .select({
        dateOfJoining: employeeProfiles.dateOfJoining,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(
        and(
          eq(employeeProfiles.managerId, managerId),
          eq(users.orgId, orgId),
        ),
      );

    const monthlyCounts: Record<string, number> = {};
    for (const row of rows) {
      if (!row.dateOfJoining) continue;
      const d = new Date(row.dateOfJoining);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyCounts[key] = (monthlyCounts[key] ?? 0) + 1;
    }

    // Sort by month key ascending
    const sorted = Object.entries(monthlyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, joins: count }));

    return { history: sorted };
  }

  async exportTeam(orgId: string, managerId: string) {
    const { data } = await this.getTeam(orgId, managerId, {});
    return { data, format: 'json', exportedAt: new Date().toISOString() };
  }
}
