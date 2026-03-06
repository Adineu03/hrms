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
export class OfferManagementService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listOffers(
    orgId: string,
    filters: { status?: string; page?: number; limit?: number },
  ) {
    const conditions: any[] = [eq(schema.offerLetters.orgId, orgId)];

    if (filters.status) {
      conditions.push(eq(schema.offerLetters.status, filters.status));
    }

    const rows = await this.db
      .select({
        offer: schema.offerLetters,
        candidate: schema.candidates,
        requisition: schema.jobRequisitions,
      })
      .from(schema.offerLetters)
      .leftJoin(schema.candidates, eq(schema.offerLetters.candidateId, schema.candidates.id))
      .leftJoin(schema.jobRequisitions, eq(schema.offerLetters.requisitionId, schema.jobRequisitions.id))
      .where(and(...conditions))
      .orderBy(desc(schema.offerLetters.createdAt));

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const paginated = rows.slice(offset, offset + limit);

    return {
      data: paginated.map((r) => this.toOfferDto(r)),
      meta: {
        total: rows.length,
        page,
        limit,
        totalPages: Math.ceil(rows.length / limit),
      },
    };
  }

  async createOffer(orgId: string, createdBy: string, data: Record<string, any>) {
    // Verify candidate exists
    if (data.candidateId) {
      const [candidate] = await this.db
        .select({ id: schema.candidates.id })
        .from(schema.candidates)
        .where(
          and(
            eq(schema.candidates.id, data.candidateId),
            eq(schema.candidates.orgId, orgId),
          ),
        )
        .limit(1);

      if (!candidate) throw new BadRequestException('Candidate not found');
    }

    // Verify application exists
    if (data.applicationId) {
      const [application] = await this.db
        .select({ id: schema.applications.id })
        .from(schema.applications)
        .where(
          and(
            eq(schema.applications.id, data.applicationId),
            eq(schema.applications.orgId, orgId),
          ),
        )
        .limit(1);

      if (!application) throw new BadRequestException('Application not found');
    }

    const [created] = await this.db
      .insert(schema.offerLetters)
      .values({
        orgId,
        applicationId: data.applicationId,
        candidateId: data.candidateId,
        requisitionId: data.requisitionId,
        designation: data.designation,
        department: data.department ?? null,
        location: data.location ?? null,
        employmentType: data.employmentType ?? 'full_time',
        salaryAmount: data.salaryAmount,
        currency: data.currency ?? 'INR',
        salaryBreakdown: data.salaryBreakdown ?? {},
        joiningDate: data.joiningDate ?? null,
        probationMonths: data.probationMonths ?? 6,
        reportingTo: data.reportingTo ?? null,
        terms: data.terms ?? null,
        benefits: data.benefits ?? [],
        templateId: data.templateId ?? null,
        approvalChain: data.approvalChain ?? [],
        validUntil: data.validUntil ?? null,
        status: 'draft',
        createdBy,
        metadata: data.metadata ?? {},
      })
      .returning();

    return this.getOffer(orgId, created.id);
  }

  async getOffer(orgId: string, id: string) {
    const [row] = await this.db
      .select({
        offer: schema.offerLetters,
        candidate: schema.candidates,
        requisition: schema.jobRequisitions,
      })
      .from(schema.offerLetters)
      .leftJoin(schema.candidates, eq(schema.offerLetters.candidateId, schema.candidates.id))
      .leftJoin(schema.jobRequisitions, eq(schema.offerLetters.requisitionId, schema.jobRequisitions.id))
      .where(
        and(
          eq(schema.offerLetters.id, id),
          eq(schema.offerLetters.orgId, orgId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Offer not found');

    return this.toOfferDto(row);
  }

  async updateOffer(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select({ id: schema.offerLetters.id, status: schema.offerLetters.status })
      .from(schema.offerLetters)
      .where(
        and(
          eq(schema.offerLetters.id, id),
          eq(schema.offerLetters.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Offer not found');

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft offers can be updated');
    }

    const now = new Date();
    const updates: Record<string, any> = { updatedAt: now };
    const allowedFields = [
      'designation', 'department', 'location', 'employmentType', 'salaryAmount',
      'currency', 'salaryBreakdown', 'joiningDate', 'probationMonths',
      'reportingTo', 'terms', 'benefits', 'templateId', 'approvalChain',
      'validUntil', 'metadata',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    await this.db
      .update(schema.offerLetters)
      .set(updates)
      .where(
        and(
          eq(schema.offerLetters.id, id),
          eq(schema.offerLetters.orgId, orgId),
        ),
      );

    return this.getOffer(orgId, id);
  }

  async submitForApproval(orgId: string, id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.offerLetters)
      .where(
        and(
          eq(schema.offerLetters.id, id),
          eq(schema.offerLetters.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Offer not found');

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft offers can be submitted for approval');
    }

    await this.db
      .update(schema.offerLetters)
      .set({ status: 'pending_approval', currentApproverLevel: 1, updatedAt: new Date() })
      .where(
        and(
          eq(schema.offerLetters.id, id),
          eq(schema.offerLetters.orgId, orgId),
        ),
      );

    return this.getOffer(orgId, id);
  }

  async approveOffer(orgId: string, id: string, approvedBy: string) {
    const [existing] = await this.db
      .select()
      .from(schema.offerLetters)
      .where(
        and(
          eq(schema.offerLetters.id, id),
          eq(schema.offerLetters.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Offer not found');

    if (existing.status !== 'pending_approval') {
      throw new BadRequestException('Only pending offers can be approved');
    }

    const approvalChain = (existing.approvalChain as any[]) ?? [];
    const currentLevel = existing.currentApproverLevel ?? 1;

    if (currentLevel < approvalChain.length) {
      // Advance to next level
      await this.db
        .update(schema.offerLetters)
        .set({
          currentApproverLevel: currentLevel + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.offerLetters.id, id),
            eq(schema.offerLetters.orgId, orgId),
          ),
        );
    } else {
      // Final approval
      await this.db
        .update(schema.offerLetters)
        .set({
          status: 'approved',
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.offerLetters.id, id),
            eq(schema.offerLetters.orgId, orgId),
          ),
        );
    }

    return this.getOffer(orgId, id);
  }

  async rejectOffer(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.offerLetters)
      .where(
        and(
          eq(schema.offerLetters.id, id),
          eq(schema.offerLetters.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Offer not found');

    if (existing.status !== 'pending_approval') {
      throw new BadRequestException('Only pending offers can be rejected');
    }

    await this.db
      .update(schema.offerLetters)
      .set({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: data.reason ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.offerLetters.id, id),
          eq(schema.offerLetters.orgId, orgId),
        ),
      );

    return this.getOffer(orgId, id);
  }

  async sendOffer(orgId: string, id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.offerLetters)
      .where(
        and(
          eq(schema.offerLetters.id, id),
          eq(schema.offerLetters.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Offer not found');

    if (existing.status !== 'approved') {
      throw new BadRequestException('Only approved offers can be sent');
    }

    await this.db
      .update(schema.offerLetters)
      .set({
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.offerLetters.id, id),
          eq(schema.offerLetters.orgId, orgId),
        ),
      );

    return this.getOffer(orgId, id);
  }

  async revokeOffer(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.offerLetters)
      .where(
        and(
          eq(schema.offerLetters.id, id),
          eq(schema.offerLetters.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Offer not found');

    const revocableStatuses = ['approved', 'sent', 'pending_approval'];
    if (!revocableStatuses.includes(existing.status)) {
      throw new BadRequestException('This offer cannot be revoked');
    }

    await this.db
      .update(schema.offerLetters)
      .set({
        status: 'withdrawn',
        metadata: {
          ...(existing.metadata as Record<string, any>),
          revokeReason: data.reason ?? '',
          revokedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.offerLetters.id, id),
          eq(schema.offerLetters.orgId, orgId),
        ),
      );

    return this.getOffer(orgId, id);
  }

  async getOfferAnalytics(orgId: string) {
    // Total offers by status
    const offersByStatus = await this.db
      .select({
        status: schema.offerLetters.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.offerLetters)
      .where(eq(schema.offerLetters.orgId, orgId))
      .groupBy(schema.offerLetters.status);

    const totalOffers = offersByStatus.reduce((sum, r) => sum + r.count, 0);
    const acceptedCount = offersByStatus.find((r) => r.status === 'accepted')?.count ?? 0;
    const sentCount = offersByStatus.find((r) => r.status === 'sent')?.count ?? 0;
    const rejectedCount = offersByStatus.find((r) => r.status === 'rejected')?.count ?? 0;

    // Acceptance rate
    const totalDecided = acceptedCount + rejectedCount;
    const acceptanceRate = totalDecided > 0 ? Number(((acceptedCount / totalDecided) * 100).toFixed(2)) : 0;

    // Negotiation rate
    const [negotiationStats] = await this.db.execute(sql`
      SELECT
        COUNT(CASE WHEN jsonb_array_length(COALESCE(negotiation_history, '[]'::jsonb)) > 0 THEN 1 END)::int AS negotiated,
        COUNT(*)::int AS total
      FROM offer_letters
      WHERE org_id = ${orgId}
    `);

    const negotiationRate =
      (negotiationStats as any)?.total > 0
        ? Number((((negotiationStats as any).negotiated / (negotiationStats as any).total) * 100).toFixed(2))
        : 0;

    // Average time to accept
    const [avgAcceptTime] = await this.db.execute(sql`
      SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (accepted_at - sent_at)) / 86400)::int,
        0
      ) AS avg_days
      FROM offer_letters
      WHERE org_id = ${orgId}
        AND accepted_at IS NOT NULL
        AND sent_at IS NOT NULL
    `);

    return {
      totalOffers,
      offersByStatus,
      acceptanceRate,
      negotiationRate,
      averageTimeToAcceptDays: (avgAcceptTime as any)?.avg_days ?? 0,
      pendingOffers: sentCount,
    };
  }

  async getOfferTemplates(orgId: string) {
    const rows = await this.db
      .select({
        templateId: schema.offerLetters.templateId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.offerLetters)
      .where(eq(schema.offerLetters.orgId, orgId))
      .groupBy(schema.offerLetters.templateId)
      .orderBy(desc(sql`count(*)`));

    return { data: rows.filter((r) => r.templateId !== null) };
  }

  private toOfferDto(row: {
    offer: typeof schema.offerLetters.$inferSelect;
    candidate: typeof schema.candidates.$inferSelect | null;
    requisition: typeof schema.jobRequisitions.$inferSelect | null;
  }) {
    const o = row.offer;
    return {
      id: o.id,
      orgId: o.orgId,
      applicationId: o.applicationId,
      candidateId: o.candidateId,
      candidateName: row.candidate
        ? `${row.candidate.firstName} ${row.candidate.lastName ?? ''}`.trim()
        : null,
      candidateEmail: row.candidate?.email ?? null,
      requisitionId: o.requisitionId,
      requisitionTitle: row.requisition?.title ?? null,
      designation: o.designation,
      department: o.department,
      location: o.location,
      employmentType: o.employmentType,
      salaryAmount: o.salaryAmount,
      currency: o.currency,
      salaryBreakdown: o.salaryBreakdown,
      joiningDate: o.joiningDate,
      probationMonths: o.probationMonths,
      reportingTo: o.reportingTo,
      terms: o.terms,
      benefits: o.benefits,
      templateId: o.templateId,
      approvalChain: o.approvalChain,
      currentApproverLevel: o.currentApproverLevel,
      approvedBy: o.approvedBy,
      approvedAt: o.approvedAt?.toISOString() ?? null,
      status: o.status,
      sentAt: o.sentAt?.toISOString() ?? null,
      acceptedAt: o.acceptedAt?.toISOString() ?? null,
      rejectedAt: o.rejectedAt?.toISOString() ?? null,
      rejectionReason: o.rejectionReason,
      negotiationHistory: o.negotiationHistory,
      validUntil: o.validUntil,
      documentUrl: o.documentUrl,
      createdBy: o.createdBy,
      metadata: o.metadata,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    };
  }
}
