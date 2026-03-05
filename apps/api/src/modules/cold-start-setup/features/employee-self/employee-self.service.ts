import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { EmployeeProfileData } from '@hrms/shared';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';

// Fields that an employee is allowed to update on their own profile
const SELF_EDITABLE_FIELDS = [
  'phone',
  'personalEmail',
  'dateOfBirth',
  'gender',
  'address',
  'profilePhotoUrl',
  'emergencyContacts',
  'bankDetails',
] as const;

@Injectable()
export class EmployeeSelfService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getProfile(
    orgId: string,
    userId: string,
  ): Promise<EmployeeProfileData | null> {
    const [profile] = await this.db
      .select()
      .from(employeeProfiles)
      .where(
        and(
          eq(employeeProfiles.userId, userId),
          eq(employeeProfiles.orgId, orgId),
        ),
      )
      .limit(1);

    if (!profile) {
      return null;
    }

    return this.mapToProfileData(profile);
  }

  async updateProfile(
    orgId: string,
    userId: string,
    data: Partial<EmployeeProfileData>,
  ): Promise<EmployeeProfileData> {
    const [existing] = await this.db
      .select()
      .from(employeeProfiles)
      .where(
        and(
          eq(employeeProfiles.userId, userId),
          eq(employeeProfiles.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Employee profile not found');
    }

    // Only allow updating personal fields
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.personalEmail !== undefined)
      updates.personalEmail = data.personalEmail;
    if (data.dateOfBirth !== undefined)
      updates.dateOfBirth = data.dateOfBirth;
    if (data.gender !== undefined) updates.gender = data.gender;
    if (data.address !== undefined) updates.address = data.address;
    if (data.profilePhotoUrl !== undefined)
      updates.profilePhotoUrl = data.profilePhotoUrl;
    if (data.emergencyContacts !== undefined)
      updates.emergencyContacts = data.emergencyContacts;
    if (data.bankDetails !== undefined)
      updates.bankDetails = data.bankDetails;

    const [updated] = await this.db
      .update(employeeProfiles)
      .set(updates)
      .where(
        and(
          eq(employeeProfiles.userId, userId),
          eq(employeeProfiles.orgId, orgId),
        ),
      )
      .returning();

    return this.mapToProfileData(updated);
  }

  async getOnboardingStatus(
    orgId: string,
    userId: string,
  ): Promise<{
    status: string;
    progress: Record<string, boolean>;
    completionPercentage: number;
  }> {
    const [profile] = await this.db
      .select({
        onboardingStatus: employeeProfiles.onboardingStatus,
        onboardingProgress: employeeProfiles.onboardingProgress,
      })
      .from(employeeProfiles)
      .where(
        and(
          eq(employeeProfiles.userId, userId),
          eq(employeeProfiles.orgId, orgId),
        ),
      )
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    const status = profile.onboardingStatus ?? 'pending';
    const progress =
      (profile.onboardingProgress as Record<string, boolean>) ?? {};

    const totalSteps = Object.keys(progress).length;
    const completedSteps = Object.values(progress).filter(Boolean).length;
    const completionPercentage =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return { status, progress, completionPercentage };
  }

  async completeOnboardingStep(
    orgId: string,
    userId: string,
    stepId: string,
  ): Promise<void> {
    const [profile] = await this.db
      .select({
        onboardingProgress: employeeProfiles.onboardingProgress,
      })
      .from(employeeProfiles)
      .where(
        and(
          eq(employeeProfiles.userId, userId),
          eq(employeeProfiles.orgId, orgId),
        ),
      )
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    const progress =
      (profile.onboardingProgress as Record<string, boolean>) ?? {};
    progress[stepId] = true;

    // Check if all steps are completed
    const allCompleted = Object.values(progress).every(Boolean);

    const now = new Date();
    await this.db
      .update(employeeProfiles)
      .set({
        onboardingProgress: progress,
        onboardingStatus: allCompleted ? 'completed' : 'in_progress',
        updatedAt: now,
      })
      .where(
        and(
          eq(employeeProfiles.userId, userId),
          eq(employeeProfiles.orgId, orgId),
        ),
      );
  }

  private mapToProfileData(
    profile: typeof employeeProfiles.$inferSelect,
  ): EmployeeProfileData {
    return {
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
        (profile.onboardingProgress as Record<string, boolean>) ?? undefined,
    };
  }
}
