import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { eq, and, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type {
  EmployeeProfileData,
  EmployeeWithProfile,
  OrgChartNode,
} from '@hrms/shared';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { departments } from '../../../../infrastructure/database/schema/departments';
import { designations } from '../../../../infrastructure/database/schema/designations';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class EmployeesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async list(
    orgId: string,
    filters?: { departmentId?: string; isActive?: boolean },
  ): Promise<EmployeeWithProfile[]> {
    const rows = await this.db
      .select({
        user: users,
        profile: employeeProfiles,
      })
      .from(users)
      .leftJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(eq(users.orgId, orgId));

    let filtered = rows;

    if (filters?.departmentId) {
      filtered = filtered.filter(
        (r) => r.profile?.departmentId === filters.departmentId,
      );
    }

    if (filters?.isActive !== undefined) {
      filtered = filtered.filter(
        (r) => r.user.isActive === filters.isActive,
      );
    }

    return filtered.map((r) => this.mapToEmployeeWithProfile(r.user, r.profile));
  }

  async getById(orgId: string, userId: string): Promise<EmployeeWithProfile> {
    const [result] = await this.db
      .select({
        user: users,
        profile: employeeProfiles,
      })
      .from(users)
      .leftJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(and(eq(users.id, userId), eq(users.orgId, orgId)))
      .limit(1);

    if (!result) {
      throw new NotFoundException('Employee not found');
    }

    return this.mapToEmployeeWithProfile(result.user, result.profile);
  }

  async create(
    orgId: string,
    data: {
      email: string;
      firstName: string;
      lastName?: string;
      role?: string;
      departmentId?: string;
      designationId?: string;
      locationId?: string;
      gradeId?: string;
      managerId?: string;
    },
  ): Promise<EmployeeWithProfile> {
    // Check email uniqueness within org
    const [existingUser] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, data.email), eq(users.orgId, orgId)))
      .limit(1);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    return await this.db.transaction(async (tx) => {
      // Create user with random temporary password
      const tempPassword = randomUUID();
      const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

      const [user] = await tx
        .insert(users)
        .values({
          orgId,
          email: data.email,
          passwordHash,
          role: (data.role as any) ?? 'employee',
          firstName: data.firstName,
          lastName: data.lastName ?? null,
        })
        .returning();

      // Create employee profile
      const [profile] = await tx
        .insert(employeeProfiles)
        .values({
          orgId,
          userId: user.id,
          departmentId: data.departmentId ?? null,
          designationId: data.designationId ?? null,
          locationId: data.locationId ?? null,
          gradeId: data.gradeId ?? null,
          managerId: data.managerId ?? null,
          onboardingStatus: 'pending',
        })
        .returning();

      return this.mapToEmployeeWithProfile(user, profile);
    });
  }

  async update(
    orgId: string,
    userId: string,
    data: Partial<EmployeeProfileData>,
  ): Promise<EmployeeWithProfile> {
    // Verify user exists in this org
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.orgId, orgId)))
      .limit(1);

    if (!existingUser) {
      throw new NotFoundException('Employee not found');
    }

    const now = new Date();

    // Update user fields if provided
    const userUpdates: Record<string, any> = { updatedAt: now };
    if (data.userId) delete data.userId; // Cannot change userId

    // Check for firstName/lastName in the profile data (passed through)
    // These don't exist on EmployeeProfileData directly, but we handle them via the user record
    // The controller may pass them separately

    if (Object.keys(userUpdates).length > 1) {
      await this.db
        .update(users)
        .set(userUpdates)
        .where(and(eq(users.id, userId), eq(users.orgId, orgId)));
    }

    // Update employee profile
    const profileUpdates: Record<string, any> = { updatedAt: now };

    if (data.departmentId !== undefined)
      profileUpdates.departmentId = data.departmentId;
    if (data.designationId !== undefined)
      profileUpdates.designationId = data.designationId;
    if (data.locationId !== undefined)
      profileUpdates.locationId = data.locationId;
    if (data.gradeId !== undefined) profileUpdates.gradeId = data.gradeId;
    if (data.managerId !== undefined)
      profileUpdates.managerId = data.managerId;
    if (data.dateOfBirth !== undefined)
      profileUpdates.dateOfBirth = data.dateOfBirth;
    if (data.gender !== undefined) profileUpdates.gender = data.gender;
    if (data.phone !== undefined) profileUpdates.phone = data.phone;
    if (data.personalEmail !== undefined)
      profileUpdates.personalEmail = data.personalEmail;
    if (data.dateOfJoining !== undefined)
      profileUpdates.dateOfJoining = data.dateOfJoining;
    if (data.probationEndDate !== undefined)
      profileUpdates.probationEndDate = data.probationEndDate;
    if (data.employmentType !== undefined)
      profileUpdates.employmentType = data.employmentType;
    if (data.workModel !== undefined)
      profileUpdates.workModel = data.workModel;
    if (data.profilePhotoUrl !== undefined)
      profileUpdates.profilePhotoUrl = data.profilePhotoUrl;
    if (data.emergencyContacts !== undefined)
      profileUpdates.emergencyContacts = data.emergencyContacts;
    if (data.bankDetails !== undefined)
      profileUpdates.bankDetails = data.bankDetails;
    if (data.address !== undefined) profileUpdates.address = data.address;
    if (data.onboardingStatus !== undefined)
      profileUpdates.onboardingStatus = data.onboardingStatus;
    if (data.onboardingProgress !== undefined)
      profileUpdates.onboardingProgress = data.onboardingProgress;
    if (data.employeeId !== undefined)
      profileUpdates.employeeId = data.employeeId;

    if (Object.keys(profileUpdates).length > 1) {
      await this.db
        .update(employeeProfiles)
        .set(profileUpdates)
        .where(
          and(
            eq(employeeProfiles.userId, userId),
            eq(employeeProfiles.orgId, orgId),
          ),
        );
    }

    return this.getById(orgId, userId);
  }

  async deactivate(orgId: string, userId: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.orgId, orgId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    const now = new Date();
    await this.db
      .update(users)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(users.id, userId), eq(users.orgId, orgId)));
  }

  async getStats(
    orgId: string,
  ): Promise<{
    total: number;
    active: number;
    byDepartment: Record<string, number>;
  }> {
    const allUsers = await this.db
      .select({
        isActive: users.isActive,
        departmentId: employeeProfiles.departmentId,
      })
      .from(users)
      .leftJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(eq(users.orgId, orgId));

    const total = allUsers.length;
    const active = allUsers.filter((u) => u.isActive).length;

    // Count by department
    const byDepartment: Record<string, number> = {};
    for (const row of allUsers) {
      const deptId = row.departmentId ?? 'unassigned';
      byDepartment[deptId] = (byDepartment[deptId] ?? 0) + 1;
    }

    return { total, active, byDepartment };
  }

  async getOrgChart(orgId: string): Promise<OrgChartNode[]> {
    // Load all employees with profiles
    const rows = await this.db
      .select({
        user: users,
        profile: employeeProfiles,
      })
      .from(users)
      .leftJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(and(eq(users.orgId, orgId), eq(users.isActive, true)));

    // Load department and designation names for lookup
    const deptRows = await this.db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.orgId, orgId));

    const desRows = await this.db
      .select({ id: designations.id, name: designations.name })
      .from(designations)
      .where(eq(designations.orgId, orgId));

    const deptMap = new Map(deptRows.map((d) => [d.id, d.name]));
    const desMap = new Map(desRows.map((d) => [d.id, d.name]));

    // Build a map of userId -> node
    const nodeMap = new Map<string, OrgChartNode>();
    const managerMap = new Map<string, string | null>(); // userId -> managerId

    for (const row of rows) {
      const node: OrgChartNode = {
        user: {
          id: row.user.id,
          firstName: row.user.firstName,
          lastName: row.user.lastName ?? undefined,
          email: row.user.email,
        },
        profile: {
          designation: row.profile?.designationId
            ? desMap.get(row.profile.designationId)
            : undefined,
          department: row.profile?.departmentId
            ? deptMap.get(row.profile.departmentId)
            : undefined,
          profilePhotoUrl: row.profile?.profilePhotoUrl ?? undefined,
        },
        children: [],
      };

      nodeMap.set(row.user.id, node);
      managerMap.set(row.user.id, row.profile?.managerId ?? null);
    }

    // Build the tree
    const roots: OrgChartNode[] = [];

    for (const [userId, managerId] of managerMap) {
      const node = nodeMap.get(userId);
      if (!node) continue;

      if (managerId && nodeMap.has(managerId)) {
        nodeMap.get(managerId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private mapToEmployeeWithProfile(
    user: typeof users.$inferSelect,
    profile: typeof employeeProfiles.$inferSelect | null,
  ): EmployeeWithProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName ?? undefined,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      profile: profile
        ? {
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
            onboardingStatus:
              (profile.onboardingStatus as any) ?? undefined,
            onboardingProgress:
              (profile.onboardingProgress as Record<string, boolean>) ??
              undefined,
          }
        : undefined,
    };
  }
}
