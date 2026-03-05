import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { users } from '../../../../infrastructure/database/schema/users';
import { departments } from '../../../../infrastructure/database/schema/departments';
import { designations } from '../../../../infrastructure/database/schema/designations';
import { locations } from '../../../../infrastructure/database/schema/locations';
import { grades } from '../../../../infrastructure/database/schema/grades';
import { auditLogs } from '../../../../infrastructure/database/schema/audit-logs';
import { customFieldValues } from '../../../../infrastructure/database/schema/custom-fields';

// Fields employees may update on their enhanced profile
const SELF_EDITABLE_FIELDS = [
  'phone',
  'personalEmail',
  'dateOfBirth',
  'gender',
  'address',
  'profilePhotoUrl',
  'emergencyContacts',
  'bankDetails',
  'documents', // used to store dependents, personalIds, skills, etc.
] as const;

const COMPLETENESS_FIELDS = [
  'firstName',
  'email',
  'phone',
  'dateOfBirth',
  'gender',
  'departmentId',
  'designationId',
  'locationId',
  'emergencyContacts',
  'bankDetails',
  'address',
  'profilePhotoUrl',
] as const;

@Injectable()
export class MyProfileService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getProfile(orgId: string, userId: string) {
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
      throw new NotFoundException('Employee profile not found');
    }

    const [user] = await this.db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Resolve department, designation, location, grade names
    let departmentName: string | null = null;
    let designationName: string | null = null;
    let locationName: string | null = null;
    let gradeName: string | null = null;

    if (profile.departmentId) {
      const [dept] = await this.db
        .select({ name: departments.name })
        .from(departments)
        .where(eq(departments.id, profile.departmentId))
        .limit(1);
      departmentName = dept?.name ?? null;
    }

    if (profile.designationId) {
      const [desig] = await this.db
        .select({ name: designations.name })
        .from(designations)
        .where(eq(designations.id, profile.designationId))
        .limit(1);
      designationName = desig?.name ?? null;
    }

    if (profile.locationId) {
      const [loc] = await this.db
        .select({ name: locations.name })
        .from(locations)
        .where(eq(locations.id, profile.locationId))
        .limit(1);
      locationName = loc?.name ?? null;
    }

    if (profile.gradeId) {
      const [grd] = await this.db
        .select({ name: grades.name })
        .from(grades)
        .where(eq(grades.id, profile.gradeId))
        .limit(1);
      gradeName = grd?.name ?? null;
    }

    // Fetch custom field values for this employee profile
    const cfValues = await this.db
      .select()
      .from(customFieldValues)
      .where(
        and(
          eq(customFieldValues.orgId, orgId),
          eq(customFieldValues.entityId, profile.id),
        ),
      );

    const completeness = this.calculateCompleteness(profile, user);

    return {
      ...this.mapProfile(profile),
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      email: user?.email ?? null,
      role: user?.role ?? null,
      departmentName,
      designationName,
      locationName,
      gradeName,
      customFieldValues: cfValues.map((cf) => ({
        fieldId: cf.fieldId,
        value: cf.value,
      })),
      completeness,
    };
  }

  async updateProfile(orgId: string, userId: string, data: Record<string, any>) {
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

    const updates: Record<string, any> = { updatedAt: new Date() };

    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.personalEmail !== undefined) updates.personalEmail = data.personalEmail;
    if (data.dateOfBirth !== undefined) updates.dateOfBirth = data.dateOfBirth;
    if (data.gender !== undefined) updates.gender = data.gender;
    if (data.address !== undefined) updates.address = data.address;
    if (data.profilePhotoUrl !== undefined) updates.profilePhotoUrl = data.profilePhotoUrl;
    if (data.emergencyContacts !== undefined) updates.emergencyContacts = data.emergencyContacts;
    if (data.bankDetails !== undefined) updates.bankDetails = data.bankDetails;
    // Store dependents, personalIds, skills in the documents jsonb field
    if (data.documents !== undefined) updates.documents = data.documents;

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

    // Create audit log entry
    await this.db.insert(auditLogs).values({
      orgId,
      userId,
      action: 'update',
      entity: 'employee',
      entityId: userId,
      oldValue: this.mapProfile(existing),
      newValue: updates,
      description: 'Employee updated own profile',
    });

    return this.mapProfile(updated);
  }

  async getCompleteness(orgId: string, userId: string) {
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
      throw new NotFoundException('Employee profile not found');
    }

    const [user] = await this.db
      .select({
        firstName: users.firstName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return this.calculateCompleteness(profile, user);
  }

  async getEditHistory(orgId: string, userId: string) {
    const logs = await this.db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.orgId, orgId),
          eq(auditLogs.entity, 'employee'),
          eq(auditLogs.entityId, userId),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);

    return {
      editHistory: logs.map((log) => ({
        id: log.id,
        action: log.action,
        description: log.description,
        oldValue: log.oldValue,
        newValue: log.newValue,
        createdAt: log.createdAt,
      })),
    };
  }

  private calculateCompleteness(
    profile: typeof employeeProfiles.$inferSelect,
    user: { firstName?: string; email?: string } | undefined,
  ) {
    let filled = 0;
    const total = COMPLETENESS_FIELDS.length;

    if (user?.firstName) filled++;
    if (user?.email) filled++;
    if (profile.phone) filled++;
    if (profile.dateOfBirth) filled++;
    if (profile.gender) filled++;
    if (profile.departmentId) filled++;
    if (profile.designationId) filled++;
    if (profile.locationId) filled++;
    if (profile.profilePhotoUrl) filled++;

    const emergencyContacts = profile.emergencyContacts as any[];
    if (emergencyContacts && emergencyContacts.length > 0) filled++;

    const bankDetails = profile.bankDetails as Record<string, any>;
    if (bankDetails && Object.keys(bankDetails).length > 0) filled++;

    const address = profile.address as Record<string, any>;
    if (address && Object.keys(address).length > 0) filled++;

    const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;

    return {
      filled,
      total,
      percentage,
      missingFields: this.getMissingFields(profile, user),
    };
  }

  private getMissingFields(
    profile: typeof employeeProfiles.$inferSelect,
    user: { firstName?: string; email?: string } | undefined,
  ): string[] {
    const missing: string[] = [];
    if (!user?.firstName) missing.push('firstName');
    if (!user?.email) missing.push('email');
    if (!profile.phone) missing.push('phone');
    if (!profile.dateOfBirth) missing.push('dateOfBirth');
    if (!profile.gender) missing.push('gender');
    if (!profile.departmentId) missing.push('departmentId');
    if (!profile.designationId) missing.push('designationId');
    if (!profile.locationId) missing.push('locationId');
    if (!profile.profilePhotoUrl) missing.push('profilePhotoUrl');
    const ec = profile.emergencyContacts as any[];
    if (!ec || ec.length === 0) missing.push('emergencyContacts');
    const bd = profile.bankDetails as Record<string, any>;
    if (!bd || Object.keys(bd).length === 0) missing.push('bankDetails');
    const addr = profile.address as Record<string, any>;
    if (!addr || Object.keys(addr).length === 0) missing.push('address');
    return missing;
  }

  private mapProfile(profile: typeof employeeProfiles.$inferSelect) {
    return {
      id: profile.id,
      userId: profile.userId,
      employeeId: profile.employeeId ?? null,
      departmentId: profile.departmentId ?? null,
      designationId: profile.designationId ?? null,
      locationId: profile.locationId ?? null,
      gradeId: profile.gradeId ?? null,
      managerId: profile.managerId ?? null,
      dateOfBirth: profile.dateOfBirth ?? null,
      gender: profile.gender ?? null,
      phone: profile.phone ?? null,
      personalEmail: profile.personalEmail ?? null,
      dateOfJoining: profile.dateOfJoining ?? null,
      probationEndDate: profile.probationEndDate ?? null,
      employmentType: profile.employmentType ?? null,
      workModel: profile.workModel ?? null,
      profilePhotoUrl: profile.profilePhotoUrl ?? null,
      emergencyContacts: profile.emergencyContacts ?? [],
      bankDetails: profile.bankDetails ?? {},
      documents: profile.documents ?? [],
      address: profile.address ?? {},
    };
  }
}
