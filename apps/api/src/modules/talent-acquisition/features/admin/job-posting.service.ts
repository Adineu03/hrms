import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class JobPostingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listPostings(
    orgId: string,
    filters: { status?: string; postingType?: string; page?: number; limit?: number },
  ) {
    const conditions: any[] = [
      eq(schema.jobPostings.orgId, orgId),
      eq(schema.jobPostings.isActive, true),
    ];

    if (filters.status) {
      conditions.push(eq(schema.jobPostings.status, filters.status));
    }
    if (filters.postingType) {
      conditions.push(eq(schema.jobPostings.postingType, filters.postingType));
    }

    const rows = await this.db
      .select({
        posting: schema.jobPostings,
        requisition: schema.jobRequisitions,
      })
      .from(schema.jobPostings)
      .leftJoin(
        schema.jobRequisitions,
        eq(schema.jobPostings.requisitionId, schema.jobRequisitions.id),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.jobPostings.createdAt));

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const paginated = rows.slice(offset, offset + limit);

    return {
      data: paginated.map((r) => this.toPostingDto(r)),
      meta: {
        total: rows.length,
        page,
        limit,
        totalPages: Math.ceil(rows.length / limit),
      },
    };
  }

  async createPosting(orgId: string, createdBy: string, data: Record<string, any>) {
    // Verify the requisition exists and belongs to this org
    if (data.requisitionId) {
      const [req] = await this.db
        .select({ id: schema.jobRequisitions.id })
        .from(schema.jobRequisitions)
        .where(
          and(
            eq(schema.jobRequisitions.id, data.requisitionId),
            eq(schema.jobRequisitions.orgId, orgId),
          ),
        )
        .limit(1);

      if (!req) throw new BadRequestException('Requisition not found');
    }

    const [created] = await this.db
      .insert(schema.jobPostings)
      .values({
        orgId,
        requisitionId: data.requisitionId,
        title: data.title,
        description: data.description ?? '',
        requirements: data.requirements ?? null,
        responsibilities: data.responsibilities ?? null,
        benefits: data.benefits ?? null,
        skills: data.skills ?? [],
        experience: data.experience ?? {},
        qualifications: data.qualifications ?? [],
        postingType: data.postingType ?? 'external',
        channels: data.channels ?? [],
        locationDetails: data.locationDetails ?? {},
        salaryVisible: data.salaryVisible ?? false,
        salaryDisplay: data.salaryDisplay ?? null,
        applicationDeadline: data.applicationDeadline ?? null,
        status: 'draft',
        createdBy,
        metadata: data.metadata ?? {},
      })
      .returning();

    return this.getPosting(orgId, created.id);
  }

  async getPosting(orgId: string, id: string) {
    const [row] = await this.db
      .select({
        posting: schema.jobPostings,
        requisition: schema.jobRequisitions,
      })
      .from(schema.jobPostings)
      .leftJoin(
        schema.jobRequisitions,
        eq(schema.jobPostings.requisitionId, schema.jobRequisitions.id),
      )
      .where(
        and(
          eq(schema.jobPostings.id, id),
          eq(schema.jobPostings.orgId, orgId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Job posting not found');

    return this.toPostingDto(row);
  }

  async updatePosting(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select({ id: schema.jobPostings.id })
      .from(schema.jobPostings)
      .where(
        and(
          eq(schema.jobPostings.id, id),
          eq(schema.jobPostings.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Job posting not found');

    const now = new Date();
    const updates: Record<string, any> = { updatedAt: now };
    const allowedFields = [
      'title', 'description', 'requirements', 'responsibilities', 'benefits',
      'skills', 'experience', 'qualifications', 'postingType', 'channels',
      'locationDetails', 'salaryVisible', 'salaryDisplay', 'applicationDeadline',
      'metadata',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    await this.db
      .update(schema.jobPostings)
      .set(updates)
      .where(
        and(
          eq(schema.jobPostings.id, id),
          eq(schema.jobPostings.orgId, orgId),
        ),
      );

    return this.getPosting(orgId, id);
  }

  async publishPosting(orgId: string, id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.jobPostings)
      .where(
        and(
          eq(schema.jobPostings.id, id),
          eq(schema.jobPostings.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Job posting not found');

    if (existing.status !== 'draft' && existing.status !== 'paused') {
      throw new BadRequestException('Only draft or paused postings can be published');
    }

    await this.db
      .update(schema.jobPostings)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(schema.jobPostings.id, id),
          eq(schema.jobPostings.orgId, orgId),
        ),
      );

    return this.getPosting(orgId, id);
  }

  async pausePosting(orgId: string, id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.jobPostings)
      .where(
        and(
          eq(schema.jobPostings.id, id),
          eq(schema.jobPostings.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Job posting not found');

    if (existing.status !== 'published') {
      throw new BadRequestException('Only published postings can be paused');
    }

    await this.db
      .update(schema.jobPostings)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(
        and(
          eq(schema.jobPostings.id, id),
          eq(schema.jobPostings.orgId, orgId),
        ),
      );

    return this.getPosting(orgId, id);
  }

  async closePosting(orgId: string, id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.jobPostings)
      .where(
        and(
          eq(schema.jobPostings.id, id),
          eq(schema.jobPostings.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Job posting not found');

    if (existing.status === 'closed') {
      throw new BadRequestException('Posting is already closed');
    }

    await this.db
      .update(schema.jobPostings)
      .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(schema.jobPostings.id, id),
          eq(schema.jobPostings.orgId, orgId),
        ),
      );

    return this.getPosting(orgId, id);
  }

  async getPostingAnalytics(orgId: string, id: string) {
    const [posting] = await this.db
      .select()
      .from(schema.jobPostings)
      .where(
        and(
          eq(schema.jobPostings.id, id),
          eq(schema.jobPostings.orgId, orgId),
        ),
      )
      .limit(1);

    if (!posting) throw new NotFoundException('Job posting not found');

    // Count applications for this posting
    const [appCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.jobPostingId, id),
          eq(schema.applications.orgId, orgId),
        ),
      );

    return {
      postingId: id,
      title: posting.title,
      status: posting.status,
      viewCount: posting.viewCount ?? 0,
      applicationCount: appCount?.count ?? 0,
      publishedAt: posting.publishedAt?.toISOString() ?? null,
      closedAt: posting.closedAt?.toISOString() ?? null,
      conversionRate:
        posting.viewCount && posting.viewCount > 0
          ? Number(((appCount?.count ?? 0) / posting.viewCount * 100).toFixed(2))
          : 0,
    };
  }

  private toPostingDto(row: {
    posting: typeof schema.jobPostings.$inferSelect;
    requisition: typeof schema.jobRequisitions.$inferSelect | null;
  }) {
    const p = row.posting;
    return {
      id: p.id,
      orgId: p.orgId,
      requisitionId: p.requisitionId,
      requisitionTitle: row.requisition?.title ?? null,
      requisitionStatus: row.requisition?.status ?? null,
      title: p.title,
      description: p.description,
      requirements: p.requirements,
      responsibilities: p.responsibilities,
      benefits: p.benefits,
      skills: p.skills,
      experience: p.experience,
      qualifications: p.qualifications,
      postingType: p.postingType,
      channels: p.channels,
      locationDetails: p.locationDetails,
      salaryVisible: p.salaryVisible,
      salaryDisplay: p.salaryDisplay,
      applicationDeadline: p.applicationDeadline,
      status: p.status,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      closedAt: p.closedAt?.toISOString() ?? null,
      viewCount: p.viewCount,
      applicationCount: p.applicationCount,
      createdBy: p.createdBy,
      metadata: p.metadata,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
