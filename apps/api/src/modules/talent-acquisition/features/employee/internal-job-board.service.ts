import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, or, ilike, inArray, ne } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class InternalJobBoardService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Browse Published Internal/Both Job Postings ───────────────────────
  async listJobs(
    orgId: string,
    filters: {
      department?: string;
      location?: string;
      grade?: string;
      employmentType?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    employeeId?: string,
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(schema.jobPostings.orgId, orgId),
      eq(schema.jobPostings.status, 'published'),
      eq(schema.jobPostings.isActive, true),
      or(
        eq(schema.jobPostings.postingType, 'internal'),
        eq(schema.jobPostings.postingType, 'both'),
      ),
    ];

    if (filters.department) {
      conditions.push(eq(schema.jobRequisitions.departmentId, filters.department));
    }

    if (filters.location) {
      conditions.push(eq(schema.jobRequisitions.locationId, filters.location));
    }

    if (filters.grade) {
      conditions.push(eq(schema.jobRequisitions.gradeId, filters.grade));
    }

    if (filters.employmentType) {
      conditions.push(eq(schema.jobRequisitions.employmentType, filters.employmentType));
    }

    if (filters.search) {
      conditions.push(
        or(
          ilike(schema.jobPostings.title, `%${filters.search}%`),
          ilike(schema.jobPostings.description, `%${filters.search}%`),
        )!,
      );
    }

    const rows = await this.db
      .select({
        posting: schema.jobPostings,
        requisition: schema.jobRequisitions,
        departmentName: schema.departments.name,
      })
      .from(schema.jobPostings)
      .innerJoin(
        schema.jobRequisitions,
        eq(schema.jobPostings.requisitionId, schema.jobRequisitions.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.jobRequisitions.departmentId, schema.departments.id),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.jobPostings.publishedAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.jobPostings)
      .innerJoin(
        schema.jobRequisitions,
        eq(schema.jobPostings.requisitionId, schema.jobRequisitions.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.jobRequisitions.departmentId, schema.departments.id),
      )
      .where(and(...conditions));

    // Personalize: which postings has this employee already applied to / bookmarked?
    let appliedPostingIds = new Set<string>();
    let bookmarkedPostingIds = new Set<string>();
    if (employeeId) {
      const myApps = await this.db
        .select({ jobPostingId: schema.applications.jobPostingId })
        .from(schema.applications)
        .where(
          and(
            eq(schema.applications.orgId, orgId),
            eq(schema.applications.internalEmployeeId, employeeId),
            eq(schema.applications.isActive, true),
            ne(schema.applications.status, 'withdrawn'),
          ),
        );
      appliedPostingIds = new Set(myApps.map((a) => a.jobPostingId));
      bookmarkedPostingIds = new Set(await this.getBookmarkedIds(orgId, employeeId));
    }

    return {
      data: rows.map((r) =>
        this.toJobListDto(r, {
          isApplied: appliedPostingIds.has(r.posting.id),
          isBookmarked: bookmarkedPostingIds.has(r.posting.id),
        }),
      ),
      total: countResult?.count || 0,
      page,
      limit,
      totalPages: Math.ceil((countResult?.count || 0) / limit),
    };
  }

  private async getBookmarkedIds(orgId: string, employeeId: string): Promise<string[]> {
    const [profile] = await this.db
      .select({ onboardingProgress: schema.employeeProfiles.onboardingProgress })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.userId, employeeId),
        ),
      )
      .limit(1);
    const progress = (profile?.onboardingProgress as Record<string, any>) || {};
    return Array.isArray(progress.bookmarkedJobs) ? progress.bookmarkedJobs : [];
  }

  // ── Get Job Posting Detail ────────────────────────────────────────────
  async getJobDetail(orgId: string, postingId: string) {
    const [row] = await this.db
      .select({
        posting: schema.jobPostings,
        requisition: schema.jobRequisitions,
        departmentName: schema.departments.name,
      })
      .from(schema.jobPostings)
      .innerJoin(
        schema.jobRequisitions,
        eq(schema.jobPostings.requisitionId, schema.jobRequisitions.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.jobRequisitions.departmentId, schema.departments.id),
      )
      .where(
        and(
          eq(schema.jobPostings.id, postingId),
          eq(schema.jobPostings.orgId, orgId),
          eq(schema.jobPostings.status, 'published'),
          or(
            eq(schema.jobPostings.postingType, 'internal'),
            eq(schema.jobPostings.postingType, 'both'),
          ),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Job posting not found');
    }

    // Increment view count
    await this.db
      .update(schema.jobPostings)
      .set({ viewCount: sql`${schema.jobPostings.viewCount} + 1` })
      .where(eq(schema.jobPostings.id, postingId));

    return this.toJobDetailDto(row);
  }

  // ── Apply to Internal Position ────────────────────────────────────────
  async applyToJob(
    orgId: string,
    employeeId: string,
    postingId: string,
    data: Record<string, any>,
  ) {
    // Verify posting exists and is internal/both
    const [posting] = await this.db
      .select()
      .from(schema.jobPostings)
      .where(
        and(
          eq(schema.jobPostings.id, postingId),
          eq(schema.jobPostings.orgId, orgId),
          eq(schema.jobPostings.status, 'published'),
          or(
            eq(schema.jobPostings.postingType, 'internal'),
            eq(schema.jobPostings.postingType, 'both'),
          ),
        ),
      )
      .limit(1);

    if (!posting) {
      throw new NotFoundException('Job posting not found or not open for internal applications');
    }

    // Check for existing active application
    const [existingApp] = await this.db
      .select()
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.orgId, orgId),
          eq(schema.applications.jobPostingId, postingId),
          eq(schema.applications.internalEmployeeId, employeeId),
          eq(schema.applications.isActive, true),
        ),
      )
      .limit(1);

    if (existingApp && existingApp.status !== 'withdrawn') {
      throw new BadRequestException('You have already applied to this position');
    }

    // Get employee user data
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, employeeId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('Employee not found');
    }

    // Find or create candidate record from employee data
    let candidateId: string;
    const [existingCandidate] = await this.db
      .select()
      .from(schema.candidates)
      .where(
        and(
          eq(schema.candidates.orgId, orgId),
          eq(schema.candidates.email, user.email),
        ),
      )
      .limit(1);

    if (existingCandidate) {
      candidateId = existingCandidate.id;
    } else {
      // Get employee profile for additional data
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

      const [newCandidate] = await this.db
        .insert(schema.candidates)
        .values({
          orgId,
          firstName: user.firstName,
          lastName: user.lastName || '',
          email: user.email,
          phone: profile?.phone || null,
          source: 'internal',
          status: 'active',
        })
        .returning();

      candidateId = newCandidate.id;
    }

    // Get first pipeline stage for the requisition
    const [firstStage] = await this.db
      .select()
      .from(schema.recruitmentPipelineStages)
      .where(
        and(
          eq(schema.recruitmentPipelineStages.orgId, orgId),
          eq(schema.recruitmentPipelineStages.requisitionId, posting.requisitionId),
          eq(schema.recruitmentPipelineStages.isActive, true),
        ),
      )
      .orderBy(schema.recruitmentPipelineStages.sortOrder)
      .limit(1);

    // Create application
    const [application] = await this.db
      .insert(schema.applications)
      .values({
        orgId,
        candidateId,
        jobPostingId: postingId,
        requisitionId: posting.requisitionId,
        source: 'internal',
        coverLetter: data.coverLetter || null,
        currentStageId: firstStage?.id || null,
        status: 'new',
        internalEmployeeId: employeeId,
        appliedAt: new Date(),
      })
      .returning();

    // Increment application count
    await this.db
      .update(schema.jobPostings)
      .set({ applicationCount: sql`${schema.jobPostings.applicationCount} + 1` })
      .where(eq(schema.jobPostings.id, postingId));

    return this.toApplicationDto(application);
  }

  // ── Bookmark a Position ───────────────────────────────────────────────
  async bookmarkJob(orgId: string, employeeId: string, postingId: string) {
    // Verify posting exists
    const [posting] = await this.db
      .select({ id: schema.jobPostings.id })
      .from(schema.jobPostings)
      .where(
        and(
          eq(schema.jobPostings.id, postingId),
          eq(schema.jobPostings.orgId, orgId),
        ),
      )
      .limit(1);

    if (!posting) {
      throw new NotFoundException('Job posting not found');
    }

    // Get employee profile
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

    const currentProgress = (profile.onboardingProgress as Record<string, any>) || {};
    const bookmarkedJobs: string[] = currentProgress.bookmarkedJobs || [];

    if (bookmarkedJobs.includes(postingId)) {
      return { bookmarked: true, message: 'Already bookmarked' };
    }

    bookmarkedJobs.push(postingId);

    await this.db
      .update(schema.employeeProfiles)
      .set({
        onboardingProgress: { ...currentProgress, bookmarkedJobs },
        updatedAt: new Date(),
      })
      .where(eq(schema.employeeProfiles.id, profile.id));

    return { bookmarked: true, postingId };
  }

  // ── Remove Bookmark ───────────────────────────────────────────────────
  async removeBookmark(orgId: string, employeeId: string, postingId: string) {
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

    const currentProgress = (profile.onboardingProgress as Record<string, any>) || {};
    const bookmarkedJobs: string[] = currentProgress.bookmarkedJobs || [];
    const filtered = bookmarkedJobs.filter((id) => id !== postingId);

    await this.db
      .update(schema.employeeProfiles)
      .set({
        onboardingProgress: { ...currentProgress, bookmarkedJobs: filtered },
        updatedAt: new Date(),
      })
      .where(eq(schema.employeeProfiles.id, profile.id));

    return { bookmarked: false, postingId };
  }

  // ── List Bookmarked Positions ─────────────────────────────────────────
  async getBookmarks(orgId: string, employeeId: string) {
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
      return { data: [], bookmarks: [], total: 0 };
    }

    const currentProgress = (profile.onboardingProgress as Record<string, any>) || {};
    const bookmarkedJobs: string[] = currentProgress.bookmarkedJobs || [];

    if (bookmarkedJobs.length === 0) {
      return { data: [], bookmarks: [], total: 0 };
    }

    const rows = await this.db
      .select({
        posting: schema.jobPostings,
        requisition: schema.jobRequisitions,
        departmentName: schema.departments.name,
      })
      .from(schema.jobPostings)
      .innerJoin(
        schema.jobRequisitions,
        eq(schema.jobPostings.requisitionId, schema.jobRequisitions.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.jobRequisitions.departmentId, schema.departments.id),
      )
      .where(
        and(
          eq(schema.jobPostings.orgId, orgId),
          inArray(schema.jobPostings.id, bookmarkedJobs),
        ),
      )
      .orderBy(desc(schema.jobPostings.publishedAt));

    const mapped = rows.map((r) => this.toJobListDto(r, { isBookmarked: true }));
    return {
      data: mapped,
      bookmarks: mapped,
      total: rows.length,
    };
  }

  // ── Get Recommended Postings ──────────────────────────────────────────
  async getRecommended(orgId: string, employeeId: string) {
    // Get employee profile for skills
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

    const currentProgress = (profile?.onboardingProgress as Record<string, any>) || {};
    const careerProfile = currentProgress.careerProfile || {};
    const employeeSkills: string[] = careerProfile.skills || [];

    // Get all published internal/both postings
    const rows = await this.db
      .select({
        posting: schema.jobPostings,
        requisition: schema.jobRequisitions,
        departmentName: schema.departments.name,
      })
      .from(schema.jobPostings)
      .innerJoin(
        schema.jobRequisitions,
        eq(schema.jobPostings.requisitionId, schema.jobRequisitions.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.jobRequisitions.departmentId, schema.departments.id),
      )
      .where(
        and(
          eq(schema.jobPostings.orgId, orgId),
          eq(schema.jobPostings.status, 'published'),
          eq(schema.jobPostings.isActive, true),
          or(
            eq(schema.jobPostings.postingType, 'internal'),
            eq(schema.jobPostings.postingType, 'both'),
          ),
        ),
      )
      .orderBy(desc(schema.jobPostings.publishedAt))
      .limit(50);

    const bookmarkedIds = new Set(await this.getBookmarkedIds(orgId, employeeId));

    // Score and sort by skill match
    const scored = rows.map((r) => {
      const postingSkills = (r.posting.skills as string[]) || [];
      const matchCount = employeeSkills.filter((s) =>
        postingSkills.some(
          (ps) => ps.toLowerCase() === s.toLowerCase(),
        ),
      ).length;
      const matchScore =
        postingSkills.length > 0
          ? Math.round((matchCount / postingSkills.length) * 100)
          : 0;
      return {
        ...this.toJobListDto(r, { isBookmarked: bookmarkedIds.has(r.posting.id) }),
        matchScore,
        matchedSkills: employeeSkills.filter((s) =>
          postingSkills.some(
            (ps) => ps.toLowerCase() === s.toLowerCase(),
          ),
        ),
      };
    });

    // Sort by match score descending, return top matches
    scored.sort((a, b) => b.matchScore - a.matchScore);
    const top = scored.slice(0, 20);

    return {
      data: top,
      recommendations: top,
      basedOnSkills: employeeSkills,
    };
  }

  // ── DTO Mappers ───────────────────────────────────────────────────────

  /** Split a free-text column into display bullet lines (always an array). */
  private toLines(text: string | null | undefined): string[] {
    if (!text) return [];
    return text
      .split(/\r?\n|•/)
      .map((line) => line.replace(/^[-*\s]+/, '').trim())
      .filter(Boolean);
  }

  private toJobListDto(
    row: {
      posting: typeof schema.jobPostings.$inferSelect;
      requisition: typeof schema.jobRequisitions.$inferSelect;
      departmentName: string | null;
    },
    flags: { isApplied?: boolean; isBookmarked?: boolean } = {},
  ) {
    const locationDetails = (row.posting.locationDetails as Record<string, any>) || {};
    return {
      id: row.posting.id,
      title: row.posting.title,
      description: row.posting.description,
      postingType: row.posting.postingType,
      departmentId: row.requisition.departmentId,
      departmentName: row.departmentName,
      department: row.departmentName || 'General',
      locationId: row.requisition.locationId,
      location: locationDetails.city || locationDetails.location || 'Bengaluru',
      gradeId: row.requisition.gradeId,
      employmentType: row.requisition.employmentType,
      skills: Array.isArray(row.posting.skills) ? row.posting.skills : [],
      experience: row.posting.experience,
      requirements: this.toLines(row.posting.requirements),
      responsibilities: this.toLines(row.posting.responsibilities),
      benefits: this.toLines(row.posting.benefits),
      salaryVisible: row.posting.salaryVisible,
      salaryDisplay: row.posting.salaryDisplay,
      applicationDeadline: row.posting.applicationDeadline,
      viewCount: Number(row.posting.viewCount) || 0,
      applicationCount: Number(row.posting.applicationCount) || 0,
      postedDate: (row.posting.publishedAt ?? row.posting.createdAt).toISOString(),
      publishedAt: row.posting.publishedAt?.toISOString() || null,
      createdAt: row.posting.createdAt.toISOString(),
      isApplied: flags.isApplied ?? false,
      isBookmarked: flags.isBookmarked ?? false,
    };
  }

  private toJobDetailDto(row: {
    posting: typeof schema.jobPostings.$inferSelect;
    requisition: typeof schema.jobRequisitions.$inferSelect;
    departmentName: string | null;
  }) {
    return {
      ...this.toJobListDto(row),
      qualifications: row.posting.qualifications,
      locationDetails: row.posting.locationDetails,
      requisitionTitle: row.requisition.title,
      headcount: row.requisition.headcount,
      filledCount: row.requisition.filledCount,
      priority: row.requisition.priority,
      targetHireDate: row.requisition.targetHireDate,
    };
  }

  private toApplicationDto(row: typeof schema.applications.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      candidateId: row.candidateId,
      jobPostingId: row.jobPostingId,
      requisitionId: row.requisitionId,
      source: row.source,
      coverLetter: row.coverLetter,
      currentStageId: row.currentStageId,
      status: row.status,
      internalEmployeeId: row.internalEmployeeId,
      appliedAt: row.appliedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
