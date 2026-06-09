import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { AiCoreService } from '../../../../shared/ai/ai-core.service';

@Injectable()
export class LmsConfigService {
  private readonly logger = new Logger(LmsConfigService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly ai: AiCoreService,
  ) {}

  /**
   * AI Content Generator — write an engaging course description from the title
   * plus optional skills/audience. Draft only; the admin edits before saving.
   */
  async generateCourseDescription(input: {
    title: string;
    skills?: string[];
    audience?: string;
  }): Promise<{ ok: true; description: string } | { ok: false; message: string }> {
    if (!this.ai.isReady()) return { ok: false, message: 'AI generation is not configured on this server.' };
    const title = (input.title || '').trim();
    if (!title) return { ok: false, message: 'Enter a course title first, then generate.' };

    const instructions = `You write concise, engaging descriptions for an internal learning platform.
Given a course title and optional target skills/audience, write a 2–4 sentence description that explains what learners will gain and why it matters.
Be motivating but professional; do NOT invent specific durations, prices, instructors, or accreditations.`;

    try {
      const description = await this.ai.generateText({
        name: 'CourseContent',
        instructions,
        text: JSON.stringify({
          title,
          skills: input.skills || [],
          audience: input.audience || '',
        }),
      });
      return { ok: true, description: description.trim() };
    } catch (err: any) {
      this.logger.error('Course description generation failed', err?.message || err);
      return { ok: false, message: 'Could not generate a description. Please try again.' };
    }
  }

  async getLmsConfig(orgId: string) {
    // LMS config is stored as org-level metadata in the first org_modules row for learning-development
    const [orgModule] = await this.db
      .select()
      .from(schema.orgModules)
      .where(
        and(
          eq(schema.orgModules.orgId, orgId),
          eq(schema.orgModules.moduleId, 'learning-development'),
        ),
      )
      .limit(1);

    return {
      data: (orgModule?.config as Record<string, any>) ?? {},
      moduleStatus: orgModule?.isActive ? 'active' : 'inactive',
    };
  }

  async saveLmsConfig(orgId: string, userId: string, data: Record<string, any>) {
    const [orgModule] = await this.db
      .select()
      .from(schema.orgModules)
      .where(
        and(
          eq(schema.orgModules.orgId, orgId),
          eq(schema.orgModules.moduleId, 'learning-development'),
        ),
      )
      .limit(1);

    if (!orgModule) throw new NotFoundException('Learning & Development module not found');

    const existingConfig = (orgModule.config as Record<string, any>) ?? {};
    const updatedConfig = {
      ...existingConfig,
      lmsConfig: {
        scormEnabled: data.scormEnabled ?? false,
        xapiEnabled: data.xapiEnabled ?? false,
        contentFormats: data.contentFormats ?? ['video', 'document', 'scorm'],
        contentPartnerships: data.contentPartnerships ?? [],
        complianceMandates: data.complianceMandates ?? [],
        autoEnrollment: data.autoEnrollment ?? false,
        completionCriteria: data.completionCriteria ?? {},
        certificationTracking: data.certificationTracking ?? true,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      },
    };

    await this.db
      .update(schema.orgModules)
      .set({ config: updatedConfig, updatedAt: new Date() })
      .where(
        and(
          eq(schema.orgModules.orgId, orgId),
          eq(schema.orgModules.moduleId, 'learning-development'),
        ),
      );

    return { success: true, message: 'LMS configuration saved', data: updatedConfig.lmsConfig };
  }

  async listCourses(orgId: string, filters: { type?: string; format?: string; difficulty?: string; provider?: string }) {
    const conditions: any[] = [
      eq(schema.courses.orgId, orgId),
      eq(schema.courses.isActive, true),
    ];
    if (filters.type) conditions.push(eq(schema.courses.type, filters.type));
    if (filters.format) conditions.push(eq(schema.courses.format, filters.format));
    if (filters.difficulty) conditions.push(eq(schema.courses.difficulty, filters.difficulty));
    if (filters.provider) conditions.push(eq(schema.courses.provider, filters.provider));

    const rows = await this.db
      .select()
      .from(schema.courses)
      .where(and(...conditions))
      .orderBy(desc(schema.courses.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createCourse(orgId: string, createdBy: string, data: Record<string, any>) {
    const [created] = await this.db
      .insert(schema.courses)
      .values({
        orgId,
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? 'internal',
        format: data.format ?? 'video',
        provider: data.provider ?? null,
        externalUrl: data.externalUrl ?? null,
        duration: data.duration ?? null,
        difficulty: data.difficulty ?? 'beginner',
        skills: data.skills ?? [],
        topics: data.topics ?? [],
        thumbnailUrl: data.thumbnailUrl ?? null,
        scormEnabled: data.scormEnabled ?? false,
        xapiEnabled: data.xapiEnabled ?? false,
        contentConfig: data.contentConfig ?? {},
        quizConfig: data.quizConfig ?? {},
        isMandatory: data.isMandatory ?? false,
        complianceCategory: data.complianceCategory ?? null,
        createdBy,
        metadata: data.metadata ?? {},
      })
      .returning();

    return created;
  }

  async getCourse(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.id, id),
          eq(schema.courses.orgId, orgId),
          eq(schema.courses.isActive, true),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Course not found');
    return row;
  }

  async updateCourse(orgId: string, id: string, data: Record<string, any>) {
    await this.getCourse(orgId, id);
    const updates: Record<string, any> = { updatedAt: new Date() };
    const fields = [
      'title', 'description', 'type', 'format', 'provider', 'externalUrl',
      'duration', 'difficulty', 'skills', 'topics', 'thumbnailUrl',
      'scormEnabled', 'xapiEnabled', 'contentConfig', 'quizConfig',
      'isMandatory', 'complianceCategory', 'metadata',
    ];
    for (const f of fields) {
      if (data[f] !== undefined) updates[f] = data[f];
    }

    await this.db
      .update(schema.courses)
      .set(updates)
      .where(and(eq(schema.courses.id, id), eq(schema.courses.orgId, orgId)));

    return this.getCourse(orgId, id);
  }

  async deleteCourse(orgId: string, id: string) {
    await this.getCourse(orgId, id);
    await this.db
      .update(schema.courses)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.courses.id, id), eq(schema.courses.orgId, orgId)));

    return { success: true, message: 'Course deleted' };
  }
}
