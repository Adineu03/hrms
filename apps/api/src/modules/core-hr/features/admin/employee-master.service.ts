import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { customFieldValues } from '../../../../infrastructure/database/schema/custom-fields';

interface ListFilters {
  page: number;
  limit: number;
  search?: string;
  locationId?: string;
  gradeId?: string;
  employmentType?: string;
  workModel?: string;
  departmentId?: string;
  isActive?: boolean;
}

@Injectable()
export class EmployeeMasterService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async list(orgId: string, filters: ListFilters) {
    const conditions = [eq(users.orgId, orgId)];

    if (filters.isActive !== undefined) {
      conditions.push(eq(users.isActive, filters.isActive));
    }

    const rows = await this.db
      .select({ user: users, profile: employeeProfiles })
      .from(users)
      .leftJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(and(...conditions));

    let filtered = rows;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.user.firstName.toLowerCase().includes(q) ||
          (r.user.lastName?.toLowerCase().includes(q) ?? false) ||
          r.user.email.toLowerCase().includes(q) ||
          (r.profile?.employeeId?.toLowerCase().includes(q) ?? false),
      );
    }

    if (filters.locationId) {
      filtered = filtered.filter((r) => r.profile?.locationId === filters.locationId);
    }
    if (filters.gradeId) {
      filtered = filtered.filter((r) => r.profile?.gradeId === filters.gradeId);
    }
    if (filters.employmentType) {
      filtered = filtered.filter((r) => r.profile?.employmentType === filters.employmentType);
    }
    if (filters.workModel) {
      filtered = filtered.filter((r) => r.profile?.workModel === filters.workModel);
    }
    if (filters.departmentId) {
      filtered = filtered.filter((r) => r.profile?.departmentId === filters.departmentId);
    }

    const total = filtered.length;
    const offset = (filters.page - 1) * filters.limit;
    const paginated = filtered.slice(offset, offset + filters.limit);

    return {
      data: paginated.map((r) => this.mapRow(r.user, r.profile)),
      meta: { total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) },
    };
  }

  async search(orgId: string, q: string) {
    if (!q.trim()) return [];

    const rows = await this.db
      .select({ user: users, profile: employeeProfiles })
      .from(users)
      .leftJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(
        and(
          eq(users.orgId, orgId),
          or(
            ilike(users.firstName, `%${q}%`),
            ilike(users.lastName, `%${q}%`),
            ilike(users.email, `%${q}%`),
            ilike(employeeProfiles.employeeId, `%${q}%`),
          ),
        ),
      )
      .limit(20);

    return rows.map((r) => this.mapRow(r.user, r.profile));
  }

  async getById(orgId: string, userId: string) {
    const [result] = await this.db
      .select({ user: users, profile: employeeProfiles })
      .from(users)
      .leftJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(and(eq(users.id, userId), eq(users.orgId, orgId)))
      .limit(1);

    if (!result) throw new NotFoundException('Employee not found');

    // Fetch custom field values for this employee
    const cfValues = await this.db
      .select()
      .from(customFieldValues)
      .where(and(eq(customFieldValues.orgId, orgId), eq(customFieldValues.entityId, userId)));

    const mapped = this.mapRow(result.user, result.profile);
    return { ...mapped, customFieldValues: cfValues };
  }

  async update(orgId: string, userId: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.orgId, orgId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Employee not found');

    const now = new Date();

    // Update user fields
    const userUpdates: Record<string, any> = { updatedAt: now };
    if (data.firstName !== undefined) userUpdates.firstName = data.firstName;
    if (data.lastName !== undefined) userUpdates.lastName = data.lastName;
    if (data.email !== undefined) userUpdates.email = data.email;

    if (Object.keys(userUpdates).length > 1) {
      await this.db.update(users).set(userUpdates).where(and(eq(users.id, userId), eq(users.orgId, orgId)));
    }

    // Update profile fields
    const profileUpdates: Record<string, any> = { updatedAt: now };
    const profileFields = [
      'departmentId', 'designationId', 'locationId', 'gradeId', 'managerId',
      'dateOfBirth', 'gender', 'phone', 'personalEmail', 'dateOfJoining',
      'probationEndDate', 'employmentType', 'workModel', 'profilePhotoUrl',
      'emergencyContacts', 'bankDetails', 'address', 'onboardingStatus',
      'onboardingProgress', 'employeeId',
    ];
    for (const field of profileFields) {
      if (data[field] !== undefined) profileUpdates[field] = data[field];
    }

    if (Object.keys(profileUpdates).length > 1) {
      await this.db
        .update(employeeProfiles)
        .set(profileUpdates)
        .where(and(eq(employeeProfiles.userId, userId), eq(employeeProfiles.orgId, orgId)));
    }

    return this.getById(orgId, userId);
  }

  async massUpdate(orgId: string, employeeIds: string[], updates: Record<string, any>) {
    const now = new Date();
    const results: string[] = [];

    await this.db.transaction(async (tx) => {
      for (const empId of employeeIds) {
        const profileUpdates: Record<string, any> = { updatedAt: now };
        const profileFields = [
          'departmentId', 'designationId', 'locationId', 'gradeId', 'managerId',
          'employmentType', 'workModel',
        ];
        for (const field of profileFields) {
          if (updates[field] !== undefined) profileUpdates[field] = updates[field];
        }

        if (Object.keys(profileUpdates).length > 1) {
          await tx
            .update(employeeProfiles)
            .set(profileUpdates)
            .where(and(eq(employeeProfiles.userId, empId), eq(employeeProfiles.orgId, orgId)));
        }
        results.push(empId);
      }
    });

    return { updated: results.length, employeeIds: results };
  }

  async findDuplicates(orgId: string) {
    // Find potential duplicates by matching first_name + last_name or email similarity
    const rows = await this.db.execute(sql`
      SELECT a.id AS id_a, b.id AS id_b,
             a.first_name AS first_name_a, a.last_name AS last_name_a, a.email AS email_a,
             b.first_name AS first_name_b, b.last_name AS last_name_b, b.email AS email_b
      FROM users a
      JOIN users b ON a.org_id = b.org_id AND a.id < b.id
      WHERE a.org_id = ${orgId}
        AND (
          (LOWER(a.first_name) = LOWER(b.first_name) AND LOWER(COALESCE(a.last_name,'')) = LOWER(COALESCE(b.last_name,'')))
          OR LOWER(a.email) = LOWER(b.email)
        )
      LIMIT 50
    `);

    return rows;
  }

  async mergeDuplicates(orgId: string, primaryId: string, duplicateId: string) {
    // Verify both exist in org
    const [primary] = await this.db.select().from(users).where(and(eq(users.id, primaryId), eq(users.orgId, orgId))).limit(1);
    const [duplicate] = await this.db.select().from(users).where(and(eq(users.id, duplicateId), eq(users.orgId, orgId))).limit(1);

    if (!primary) throw new NotFoundException('Primary employee not found');
    if (!duplicate) throw new NotFoundException('Duplicate employee not found');

    const now = new Date();

    // Deactivate the duplicate and keep the primary
    await this.db
      .update(users)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(users.id, duplicateId), eq(users.orgId, orgId)));

    return { success: true, primaryId, mergedId: duplicateId };
  }

  private mapRow(
    user: typeof users.$inferSelect,
    profile: typeof employeeProfiles.$inferSelect | null,
  ) {
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
            emergencyContacts: (profile.emergencyContacts as any[]) ?? undefined,
            bankDetails: (profile.bankDetails as any) ?? undefined,
            address: (profile.address as any) ?? undefined,
            onboardingStatus: (profile.onboardingStatus as any) ?? undefined,
            onboardingProgress: (profile.onboardingProgress as Record<string, boolean>) ?? undefined,
          }
        : undefined,
    };
  }
}
