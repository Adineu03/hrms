import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { EmployeeWithProfile, EmployeeProfileData } from '@hrms/shared';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';

@Injectable()
export class ManagerService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getTeam(
    orgId: string,
    managerId: string,
  ): Promise<EmployeeWithProfile[]> {
    const rows = await this.db
      .select({
        user: users,
        profile: employeeProfiles,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(
        and(
          eq(employeeProfiles.managerId, managerId),
          eq(users.orgId, orgId),
        ),
      );

    return rows.map((r) => this.mapToEmployeeWithProfile(r.user, r.profile));
  }

  async getTeamMember(
    orgId: string,
    managerId: string,
    userId: string,
  ): Promise<EmployeeWithProfile> {
    const [result] = await this.db
      .select({
        user: users,
        profile: employeeProfiles,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(
        and(
          eq(users.id, userId),
          eq(users.orgId, orgId),
          eq(employeeProfiles.managerId, managerId),
        ),
      )
      .limit(1);

    if (!result) {
      throw new NotFoundException(
        'Team member not found or not in your team',
      );
    }

    return this.mapToEmployeeWithProfile(result.user, result.profile);
  }

  private mapToEmployeeWithProfile(
    user: typeof users.$inferSelect,
    profile: typeof employeeProfiles.$inferSelect,
  ): EmployeeWithProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName ?? undefined,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      profile: {
        id: profile.id,
        userId: profile.userId,
        employeeId: profile.employeeId ?? undefined,
        departmentId: profile.departmentId ?? undefined,
        designationId: profile.designationId ?? undefined,
        locationId: profile.locationId ?? undefined,
        gradeId: profile.gradeId ?? undefined,
        managerId: profile.managerId ?? undefined,
        dateOfBirth: profile.dateOfBirth ?? undefined,
        gender: profile.gender ?? undefined,
        phone: profile.phone ?? undefined,
        personalEmail: profile.personalEmail ?? undefined,
        dateOfJoining: profile.dateOfJoining ?? undefined,
        probationEndDate: profile.probationEndDate ?? undefined,
        employmentType: profile.employmentType ?? undefined,
        workModel: profile.workModel ?? undefined,
        profilePhotoUrl: profile.profilePhotoUrl ?? undefined,
        emergencyContacts:
          (profile.emergencyContacts as any[]) ?? undefined,
        bankDetails: (profile.bankDetails as any) ?? undefined,
        address: (profile.address as any) ?? undefined,
        onboardingStatus: (profile.onboardingStatus as any) ?? undefined,
        onboardingProgress:
          (profile.onboardingProgress as Record<string, boolean>) ??
          undefined,
      },
    };
  }
}
