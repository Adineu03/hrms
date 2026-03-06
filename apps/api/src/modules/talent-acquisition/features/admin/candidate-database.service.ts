import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CandidateDatabaseService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listCandidates(
    orgId: string,
    filters: {
      status?: string;
      source?: string;
      skills?: string;
      experience?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const conditions: any[] = [
      eq(schema.candidates.orgId, orgId),
      eq(schema.candidates.isActive, true),
    ];

    if (filters.status) {
      conditions.push(eq(schema.candidates.status, filters.status));
    }
    if (filters.source) {
      conditions.push(eq(schema.candidates.source, filters.source));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(schema.candidates.firstName, `%${filters.search}%`),
          ilike(schema.candidates.lastName, `%${filters.search}%`),
          ilike(schema.candidates.email, `%${filters.search}%`),
        ),
      );
    }

    const rows = await this.db
      .select()
      .from(schema.candidates)
      .where(and(...conditions))
      .orderBy(desc(schema.candidates.createdAt));

    // Post-query filter for skills (JSONB field)
    let filtered = rows;
    if (filters.skills) {
      const skillSearch = filters.skills.toLowerCase();
      filtered = filtered.filter((r) => {
        const candidateSkills = (r.skills as string[]) ?? [];
        return candidateSkills.some((s) =>
          typeof s === 'string' ? s.toLowerCase().includes(skillSearch) : false,
        );
      });
    }

    // Post-query filter for experience
    if (filters.experience) {
      const minExp = parseFloat(filters.experience);
      if (!isNaN(minExp)) {
        filtered = filtered.filter((r) => {
          const exp = r.experienceYears ? parseFloat(r.experienceYears) : 0;
          return exp >= minExp;
        });
      }
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const total = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      data: paginated.map((r) => this.toCandidateDto(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createCandidate(orgId: string, data: Record<string, any>) {
    // Check for duplicate email within org
    const [existingEmail] = await this.db
      .select({ id: schema.candidates.id })
      .from(schema.candidates)
      .where(
        and(
          eq(schema.candidates.orgId, orgId),
          eq(schema.candidates.email, data.email),
          eq(schema.candidates.isActive, true),
        ),
      )
      .limit(1);

    if (existingEmail) {
      throw new BadRequestException('A candidate with this email already exists');
    }

    const [created] = await this.db
      .insert(schema.candidates)
      .values({
        orgId,
        firstName: data.firstName,
        lastName: data.lastName ?? null,
        email: data.email,
        phone: data.phone ?? null,
        currentTitle: data.currentTitle ?? null,
        currentCompany: data.currentCompany ?? null,
        experienceYears: data.experienceYears ?? null,
        skills: data.skills ?? [],
        education: data.education ?? [],
        resumeUrl: data.resumeUrl ?? null,
        resumeText: data.resumeText ?? null,
        linkedinUrl: data.linkedinUrl ?? null,
        portfolioUrl: data.portfolioUrl ?? null,
        source: data.source ?? 'direct',
        salaryExpectation: data.salaryExpectation ?? null,
        currency: data.currency ?? 'INR',
        noticePeriodDays: data.noticePeriodDays ?? null,
        currentLocation: data.currentLocation ?? null,
        preferredLocations: data.preferredLocations ?? [],
        tags: data.tags ?? [],
        notes: data.notes ?? null,
        status: 'active',
        metadata: data.metadata ?? {},
      })
      .returning();

    return this.toCandidateDto(created);
  }

  async getCandidate(orgId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(schema.candidates)
      .where(
        and(
          eq(schema.candidates.id, id),
          eq(schema.candidates.orgId, orgId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Candidate not found');

    // Also fetch application history
    const applications = await this.db
      .select({
        application: schema.applications,
        jobPosting: schema.jobPostings,
      })
      .from(schema.applications)
      .leftJoin(schema.jobPostings, eq(schema.applications.jobPostingId, schema.jobPostings.id))
      .where(
        and(
          eq(schema.applications.candidateId, id),
          eq(schema.applications.orgId, orgId),
        ),
      )
      .orderBy(desc(schema.applications.appliedAt));

    const dto = this.toCandidateDto(row);
    return {
      ...dto,
      applicationHistory: applications.map((a) => ({
        id: a.application.id,
        jobPostingId: a.application.jobPostingId,
        jobTitle: a.jobPosting?.title ?? null,
        status: a.application.status,
        source: a.application.source,
        overallScore: a.application.overallScore,
        appliedAt: a.application.appliedAt.toISOString(),
        createdAt: a.application.createdAt.toISOString(),
      })),
    };
  }

  async updateCandidate(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select({ id: schema.candidates.id })
      .from(schema.candidates)
      .where(
        and(
          eq(schema.candidates.id, id),
          eq(schema.candidates.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Candidate not found');

    const now = new Date();
    const updates: Record<string, any> = { updatedAt: now };
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'currentTitle', 'currentCompany',
      'experienceYears', 'skills', 'education', 'resumeUrl', 'resumeText',
      'linkedinUrl', 'portfolioUrl', 'source', 'salaryExpectation', 'currency',
      'noticePeriodDays', 'currentLocation', 'preferredLocations', 'tags',
      'notes', 'status', 'metadata',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    const [updated] = await this.db
      .update(schema.candidates)
      .set(updates)
      .where(
        and(
          eq(schema.candidates.id, id),
          eq(schema.candidates.orgId, orgId),
        ),
      )
      .returning();

    return this.toCandidateDto(updated);
  }

  async softDelete(orgId: string, id: string) {
    const [existing] = await this.db
      .select({ id: schema.candidates.id })
      .from(schema.candidates)
      .where(
        and(
          eq(schema.candidates.id, id),
          eq(schema.candidates.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Candidate not found');

    await this.db
      .update(schema.candidates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.candidates.id, id),
          eq(schema.candidates.orgId, orgId),
        ),
      );

    return { success: true, message: 'Candidate deleted' };
  }

  async addTags(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.candidates)
      .where(
        and(
          eq(schema.candidates.id, id),
          eq(schema.candidates.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Candidate not found');

    const currentTags = (existing.tags as string[]) ?? [];
    const newTags = data.tags ?? [];
    const mergedTags = [...new Set([...currentTags, ...newTags])];

    const [updated] = await this.db
      .update(schema.candidates)
      .set({ tags: mergedTags, updatedAt: new Date() })
      .where(
        and(
          eq(schema.candidates.id, id),
          eq(schema.candidates.orgId, orgId),
        ),
      )
      .returning();

    return this.toCandidateDto(updated);
  }

  async removeTag(orgId: string, id: string, tag: string) {
    const [existing] = await this.db
      .select()
      .from(schema.candidates)
      .where(
        and(
          eq(schema.candidates.id, id),
          eq(schema.candidates.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Candidate not found');

    const currentTags = (existing.tags as string[]) ?? [];
    const filteredTags = currentTags.filter((t) => t !== tag);

    const [updated] = await this.db
      .update(schema.candidates)
      .set({ tags: filteredTags, updatedAt: new Date() })
      .where(
        and(
          eq(schema.candidates.id, id),
          eq(schema.candidates.orgId, orgId),
        ),
      )
      .returning();

    return this.toCandidateDto(updated);
  }

  async getCandidateHistory(orgId: string, id: string) {
    const [candidate] = await this.db
      .select({ id: schema.candidates.id })
      .from(schema.candidates)
      .where(
        and(
          eq(schema.candidates.id, id),
          eq(schema.candidates.orgId, orgId),
        ),
      )
      .limit(1);

    if (!candidate) throw new NotFoundException('Candidate not found');

    const applications = await this.db
      .select({
        application: schema.applications,
        jobPosting: schema.jobPostings,
      })
      .from(schema.applications)
      .leftJoin(schema.jobPostings, eq(schema.applications.jobPostingId, schema.jobPostings.id))
      .where(
        and(
          eq(schema.applications.candidateId, id),
          eq(schema.applications.orgId, orgId),
        ),
      )
      .orderBy(desc(schema.applications.appliedAt));

    // Also fetch interview history
    const interviews = await this.db
      .select()
      .from(schema.interviews)
      .where(
        and(
          eq(schema.interviews.candidateId, id),
          eq(schema.interviews.orgId, orgId),
        ),
      )
      .orderBy(desc(schema.interviews.scheduledAt));

    return {
      data: {
        applications: applications.map((a) => ({
          id: a.application.id,
          jobPostingId: a.application.jobPostingId,
          jobTitle: a.jobPosting?.title ?? null,
          status: a.application.status,
          source: a.application.source,
          overallScore: a.application.overallScore,
          appliedAt: a.application.appliedAt.toISOString(),
        })),
        interviews: interviews.map((i) => ({
          id: i.id,
          applicationId: i.applicationId,
          stageId: i.stageId,
          scheduledAt: i.scheduledAt?.toISOString() ?? null,
          interviewType: i.interviewType,
          status: i.status,
          overallScore: i.overallScore,
          decision: i.decision,
        })),
      },
    };
  }

  async findDuplicates(orgId: string, filters: { email?: string; phone?: string }) {
    const conditions: any[] = [
      eq(schema.candidates.orgId, orgId),
      eq(schema.candidates.isActive, true),
    ];

    if (filters.email) {
      conditions.push(ilike(schema.candidates.email, filters.email));
    }
    if (filters.phone) {
      conditions.push(eq(schema.candidates.phone, filters.phone));
    }

    if (!filters.email && !filters.phone) {
      // Find all duplicates by email
      const rows = await this.db.execute(sql`
        SELECT c1.id AS id_a, c2.id AS id_b,
               c1.first_name AS first_name_a, c1.last_name AS last_name_a, c1.email AS email_a,
               c2.first_name AS first_name_b, c2.last_name AS last_name_b, c2.email AS email_b
        FROM candidates c1
        JOIN candidates c2 ON c1.org_id = c2.org_id AND c1.id < c2.id
        WHERE c1.org_id = ${orgId}
          AND c1.is_active = true AND c2.is_active = true
          AND (
            LOWER(c1.email) = LOWER(c2.email)
            OR (c1.phone IS NOT NULL AND c1.phone = c2.phone)
          )
        LIMIT 50
      `);

      return { data: rows };
    }

    const rows = await this.db
      .select()
      .from(schema.candidates)
      .where(and(...conditions))
      .orderBy(desc(schema.candidates.createdAt));

    return { data: rows.map((r) => this.toCandidateDto(r)) };
  }

  private toCandidateDto(row: typeof schema.candidates.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      currentTitle: row.currentTitle,
      currentCompany: row.currentCompany,
      experienceYears: row.experienceYears,
      skills: row.skills,
      education: row.education,
      resumeUrl: row.resumeUrl,
      resumeText: row.resumeText,
      linkedinUrl: row.linkedinUrl,
      portfolioUrl: row.portfolioUrl,
      source: row.source,
      salaryExpectation: row.salaryExpectation,
      currency: row.currency,
      noticePeriodDays: row.noticePeriodDays,
      currentLocation: row.currentLocation,
      preferredLocations: row.preferredLocations,
      tags: row.tags,
      notes: row.notes,
      status: row.status,
      metadata: row.metadata,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
