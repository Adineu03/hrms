import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, or, ilike } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CareerProfileService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Helper: Get Employee Profile ──────────────────────────────────────
  private async getProfile(orgId: string, employeeId: string) {
    const [profile] = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.userId, employeeId),
        ),
      )
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    return profile;
  }

  // ── Helper: Get career profile from onboardingProgress ────────────────
  private getCareerData(profile: typeof schema.employeeProfiles.$inferSelect) {
    const progress = (profile.onboardingProgress as Record<string, any>) || {};
    return progress.careerProfile || {};
  }

  // ── Helper: Save career profile into onboardingProgress ───────────────
  private async saveCareerData(
    profileId: string,
    currentProgress: Record<string, any>,
    careerProfile: Record<string, any>,
  ) {
    await this.db
      .update(schema.employeeProfiles)
      .set({
        onboardingProgress: { ...currentProgress, careerProfile },
        updatedAt: new Date(),
      })
      .where(eq(schema.employeeProfiles.id, profileId));
  }

  // ── Get Career Profile ────────────────────────────────────────────────
  async getCareerProfile(orgId: string, employeeId: string) {
    const profile = await this.getProfile(orgId, employeeId);
    const career = this.getCareerData(profile);

    // Get user data for name/email
    const [user] = await this.db
      .select({
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(eq(schema.users.id, employeeId))
      .limit(1);

    return {
      employeeId,
      name: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : null,
      email: user?.email || null,
      departmentId: profile.departmentId,
      designationId: profile.designationId,
      skills: career.skills || [],
      experience: career.experience || [],
      certifications: career.certifications || [],
      education: career.education || [],
      preferences: career.preferences || {
        roles: [],
        salaryExpectation: null,
        locations: [],
        remote: null,
      },
      visibility: career.visibility || 'not_looking',
      resumes: career.resumes || [],
      summary: career.summary || null,
      achievements: career.achievements || [],
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  // ── Update Career Profile ─────────────────────────────────────────────
  async updateCareerProfile(orgId: string, employeeId: string, data: Record<string, any>) {
    const profile = await this.getProfile(orgId, employeeId);
    const progress = (profile.onboardingProgress as Record<string, any>) || {};
    const career = progress.careerProfile || {};

    // Merge provided fields
    if (data.skills !== undefined) career.skills = data.skills;
    if (data.experience !== undefined) career.experience = data.experience;
    if (data.certifications !== undefined) career.certifications = data.certifications;
    if (data.education !== undefined) career.education = data.education;
    if (data.summary !== undefined) career.summary = data.summary;
    if (data.achievements !== undefined) career.achievements = data.achievements;
    if (data.visibility !== undefined) {
      const validVisibility = ['active', 'passive', 'not_looking'];
      if (!validVisibility.includes(data.visibility)) {
        throw new BadRequestException('visibility must be one of: active, passive, not_looking');
      }
      career.visibility = data.visibility;
    }
    if (data.preferences !== undefined) {
      career.preferences = { ...(career.preferences || {}), ...data.preferences };
    }

    career.lastUpdatedAt = new Date().toISOString();

    await this.saveCareerData(profile.id, progress, career);

    // Also update skills on the candidate record if it exists
    if (data.skills) {
      const [user] = await this.db
        .select({ email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, employeeId))
        .limit(1);

      if (user) {
        await this.db
          .update(schema.candidates)
          .set({ skills: data.skills, updatedAt: new Date() })
          .where(
            and(
              eq(schema.candidates.orgId, orgId),
              eq(schema.candidates.email, user.email),
            ),
          );
      }
    }

    return {
      message: 'Career profile updated',
      updatedFields: Object.keys(data),
    };
  }

  // ── Upload Resume Version ─────────────────────────────────────────────
  async uploadResume(orgId: string, employeeId: string, data: Record<string, any>) {
    const { url, fileName, fileSize, mimeType } = data;

    if (!url) {
      throw new BadRequestException('Resume URL is required');
    }

    const profile = await this.getProfile(orgId, employeeId);
    const progress = (profile.onboardingProgress as Record<string, any>) || {};
    const career = progress.careerProfile || {};
    const resumes: Array<Record<string, any>> = career.resumes || [];

    const resumeEntry = {
      id: crypto.randomUUID(),
      url,
      fileName: fileName || 'resume',
      fileSize: fileSize || null,
      mimeType: mimeType || 'application/pdf',
      version: resumes.length + 1,
      uploadedAt: new Date().toISOString(),
      isDefault: resumes.length === 0, // First resume is default
    };

    resumes.push(resumeEntry);
    career.resumes = resumes;

    await this.saveCareerData(profile.id, progress, career);

    // Also update candidate record resume URL if exists
    const [user] = await this.db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, employeeId))
      .limit(1);

    if (user) {
      await this.db
        .update(schema.candidates)
        .set({ resumeUrl: url, updatedAt: new Date() })
        .where(
          and(
            eq(schema.candidates.orgId, orgId),
            eq(schema.candidates.email, user.email),
          ),
        );
    }

    return resumeEntry;
  }

  // ── Delete Resume Version ─────────────────────────────────────────────
  async deleteResume(orgId: string, employeeId: string, resumeId: string) {
    const profile = await this.getProfile(orgId, employeeId);
    const progress = (profile.onboardingProgress as Record<string, any>) || {};
    const career = progress.careerProfile || {};
    const resumes: Array<Record<string, any>> = career.resumes || [];

    const index = resumes.findIndex((r) => r.id === resumeId);
    if (index === -1) {
      throw new NotFoundException('Resume not found');
    }

    const wasDefault = resumes[index].isDefault;
    resumes.splice(index, 1);

    // If the deleted resume was default, make the latest one default
    if (wasDefault && resumes.length > 0) {
      resumes[resumes.length - 1].isDefault = true;
    }

    career.resumes = resumes;

    await this.saveCareerData(profile.id, progress, career);

    return { deleted: true, resumeId };
  }

  // ── Update Job Preferences ────────────────────────────────────────────
  async updatePreferences(orgId: string, employeeId: string, data: Record<string, any>) {
    const profile = await this.getProfile(orgId, employeeId);
    const progress = (profile.onboardingProgress as Record<string, any>) || {};
    const career = progress.careerProfile || {};

    const currentPrefs = career.preferences || {};

    if (data.roles !== undefined) currentPrefs.roles = data.roles;
    if (data.salaryExpectation !== undefined) currentPrefs.salaryExpectation = data.salaryExpectation;
    if (data.salaryCurrency !== undefined) currentPrefs.salaryCurrency = data.salaryCurrency;
    if (data.locations !== undefined) currentPrefs.locations = data.locations;
    if (data.remote !== undefined) currentPrefs.remote = data.remote;
    if (data.employmentType !== undefined) currentPrefs.employmentType = data.employmentType;
    if (data.noticePeriodDays !== undefined) currentPrefs.noticePeriodDays = data.noticePeriodDays;
    if (data.availableFrom !== undefined) currentPrefs.availableFrom = data.availableFrom;

    career.preferences = currentPrefs;
    career.lastUpdatedAt = new Date().toISOString();

    await this.saveCareerData(profile.id, progress, career);

    return {
      message: 'Job preferences updated',
      preferences: currentPrefs,
    };
  }

  // ── Update Visibility ─────────────────────────────────────────────────
  async updateVisibility(orgId: string, employeeId: string, data: Record<string, any>) {
    const { visibility } = data;

    const validVisibility = ['active', 'passive', 'not_looking'];
    if (!visibility || !validVisibility.includes(visibility)) {
      throw new BadRequestException('visibility must be one of: active, passive, not_looking');
    }

    const profile = await this.getProfile(orgId, employeeId);
    const progress = (profile.onboardingProgress as Record<string, any>) || {};
    const career = progress.careerProfile || {};

    career.visibility = visibility;
    career.visibilityUpdatedAt = new Date().toISOString();

    await this.saveCareerData(profile.id, progress, career);

    return {
      visibility,
      message: `Career profile visibility set to ${visibility}`,
    };
  }
}
