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
export class OfferJoiningService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Helper: Get employee's candidate IDs ──────────────────────────────
  private async getEmployeeCandidateIds(orgId: string, employeeId: string): Promise<string[]> {
    const applications = await this.db
      .select({ candidateId: schema.applications.candidateId })
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.orgId, orgId),
          eq(schema.applications.internalEmployeeId, employeeId),
        ),
      );

    return [...new Set(applications.map((a) => a.candidateId))];
  }

  // ── List Offers for This Employee ─────────────────────────────────────
  async listOffers(orgId: string, employeeId: string) {
    const candidateIds = await this.getEmployeeCandidateIds(orgId, employeeId);

    if (candidateIds.length === 0) {
      return { data: [], total: 0 };
    }

    const rows = await this.db
      .select({
        offer: schema.offerLetters,
        postingTitle: schema.jobPostings.title,
        applicationStatus: schema.applications.status,
      })
      .from(schema.offerLetters)
      .innerJoin(
        schema.applications,
        eq(schema.offerLetters.applicationId, schema.applications.id),
      )
      .innerJoin(
        schema.jobPostings,
        eq(schema.applications.jobPostingId, schema.jobPostings.id),
      )
      .where(
        and(
          eq(schema.offerLetters.orgId, orgId),
          sql`${schema.offerLetters.candidateId} = ANY(${candidateIds}::uuid[])`,
          or(
            eq(schema.offerLetters.status, 'sent'),
            eq(schema.offerLetters.status, 'accepted'),
            eq(schema.offerLetters.status, 'rejected'),
            eq(schema.offerLetters.status, 'approved'),
          ),
        ),
      )
      .orderBy(desc(schema.offerLetters.createdAt));

    return {
      data: rows.map((r) => this.toOfferListDto(r)),
      total: rows.length,
    };
  }

  // ── Get Offer Detail ──────────────────────────────────────────────────
  async getOfferDetail(orgId: string, employeeId: string, offerId: string) {
    const candidateIds = await this.getEmployeeCandidateIds(orgId, employeeId);

    if (candidateIds.length === 0) {
      throw new NotFoundException('Offer not found');
    }

    const [row] = await this.db
      .select({
        offer: schema.offerLetters,
        postingTitle: schema.jobPostings.title,
        postingDescription: schema.jobPostings.description,
        applicationStatus: schema.applications.status,
        departmentName: schema.departments.name,
      })
      .from(schema.offerLetters)
      .innerJoin(
        schema.applications,
        eq(schema.offerLetters.applicationId, schema.applications.id),
      )
      .innerJoin(
        schema.jobPostings,
        eq(schema.applications.jobPostingId, schema.jobPostings.id),
      )
      .innerJoin(
        schema.jobRequisitions,
        eq(schema.offerLetters.requisitionId, schema.jobRequisitions.id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.jobRequisitions.departmentId, schema.departments.id),
      )
      .where(
        and(
          eq(schema.offerLetters.id, offerId),
          eq(schema.offerLetters.orgId, orgId),
          sql`${schema.offerLetters.candidateId} = ANY(${candidateIds}::uuid[])`,
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Offer not found');
    }

    return this.toOfferDetailDto(row);
  }

  // ── Accept Offer ──────────────────────────────────────────────────────
  async acceptOffer(orgId: string, employeeId: string, offerId: string) {
    const offer = await this.getAndValidateOffer(orgId, employeeId, offerId);

    if (offer.status !== 'sent' && offer.status !== 'approved') {
      throw new BadRequestException('Offer cannot be accepted in its current state');
    }

    // Check if offer has expired
    if (offer.validUntil) {
      const expiryDate = new Date(offer.validUntil);
      if (expiryDate < new Date()) {
        throw new BadRequestException('This offer has expired');
      }
    }

    const [updated] = await this.db
      .update(schema.offerLetters)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.offerLetters.id, offerId))
      .returning();

    // Update the application status to hired
    await this.db
      .update(schema.applications)
      .set({
        status: 'hired',
        hiredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.applications.id, offer.applicationId));

    return {
      id: updated.id,
      status: updated.status,
      acceptedAt: updated.acceptedAt?.toISOString() || null,
      message: 'Offer accepted successfully',
    };
  }

  // ── Reject Offer ──────────────────────────────────────────────────────
  async rejectOffer(orgId: string, employeeId: string, offerId: string, data: Record<string, any>) {
    const offer = await this.getAndValidateOffer(orgId, employeeId, offerId);

    if (offer.status !== 'sent' && offer.status !== 'approved') {
      throw new BadRequestException('Offer cannot be rejected in its current state');
    }

    const [updated] = await this.db
      .update(schema.offerLetters)
      .set({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: data.reason || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.offerLetters.id, offerId))
      .returning();

    // Update application status
    await this.db
      .update(schema.applications)
      .set({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: data.reason || 'Offer rejected by candidate',
        updatedAt: new Date(),
      })
      .where(eq(schema.applications.id, offer.applicationId));

    return {
      id: updated.id,
      status: updated.status,
      rejectedAt: updated.rejectedAt?.toISOString() || null,
      message: 'Offer rejected',
    };
  }

  // ── Get Offer Document URL ────────────────────────────────────────────
  async getOfferDocument(orgId: string, employeeId: string, offerId: string) {
    const offer = await this.getAndValidateOffer(orgId, employeeId, offerId);

    if (!offer.documentUrl) {
      throw new NotFoundException('Offer document not available');
    }

    return {
      id: offer.id,
      documentUrl: offer.documentUrl,
      designation: offer.designation,
      status: offer.status,
    };
  }

  // ── Get Joining Formalities Checklist ─────────────────────────────────
  async getJoiningFormalities(orgId: string, employeeId: string, offerId: string) {
    const offer = await this.getAndValidateOffer(orgId, employeeId, offerId);

    if (offer.status !== 'accepted') {
      throw new BadRequestException('Joining formalities are only available after accepting the offer');
    }

    const metadata = (offer.metadata as Record<string, any>) || {};
    const joiningChecklist = metadata.joiningChecklist || [
      { id: '1', task: 'Submit identity documents', completed: false },
      { id: '2', task: 'Complete background verification form', completed: false },
      { id: '3', task: 'Submit educational certificates', completed: false },
      { id: '4', task: 'Complete bank account details', completed: false },
      { id: '5', task: 'Submit previous employment relieving letter', completed: false },
      { id: '6', task: 'Complete tax declaration form', completed: false },
      { id: '7', task: 'Submit passport-size photographs', completed: false },
      { id: '8', task: 'Sign employment agreement', completed: false },
    ];

    const completedCount = joiningChecklist.filter((item: Record<string, any>) => item.completed).length;

    return {
      offerId: offer.id,
      designation: offer.designation,
      department: offer.department,
      joiningDate: offer.joiningDate,
      checklist: joiningChecklist,
      progress: {
        total: joiningChecklist.length,
        completed: completedCount,
        percentage: joiningChecklist.length > 0
          ? Math.round((completedCount / joiningChecklist.length) * 100)
          : 0,
      },
    };
  }

  // ── Confirm Joining Date ──────────────────────────────────────────────
  async confirmJoiningDate(orgId: string, employeeId: string, offerId: string, data: Record<string, any>) {
    const offer = await this.getAndValidateOffer(orgId, employeeId, offerId);

    if (offer.status !== 'accepted') {
      throw new BadRequestException('Can only confirm joining date after accepting the offer');
    }

    const { joiningDate } = data;

    if (!joiningDate) {
      throw new BadRequestException('joiningDate is required');
    }

    // Validate joining date is in the future
    const parsedDate = new Date(joiningDate);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (parsedDate < new Date()) {
      throw new BadRequestException('Joining date must be in the future');
    }

    const metadata = (offer.metadata as Record<string, any>) || {};
    metadata.joiningConfirmed = true;
    metadata.joiningConfirmedAt = new Date().toISOString();
    metadata.confirmedJoiningDate = joiningDate;

    const [updated] = await this.db
      .update(schema.offerLetters)
      .set({
        joiningDate,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(schema.offerLetters.id, offerId))
      .returning();

    return {
      id: updated.id,
      joiningDate: updated.joiningDate,
      message: 'Joining date confirmed',
    };
  }

  // ── Helper: Get and Validate Offer ────────────────────────────────────
  private async getAndValidateOffer(
    orgId: string,
    employeeId: string,
    offerId: string,
  ) {
    const candidateIds = await this.getEmployeeCandidateIds(orgId, employeeId);

    if (candidateIds.length === 0) {
      throw new NotFoundException('Offer not found');
    }

    const [offer] = await this.db
      .select()
      .from(schema.offerLetters)
      .where(
        and(
          eq(schema.offerLetters.id, offerId),
          eq(schema.offerLetters.orgId, orgId),
          sql`${schema.offerLetters.candidateId} = ANY(${candidateIds}::uuid[])`,
        ),
      )
      .limit(1);

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return offer;
  }

  // ── DTO Mappers ───────────────────────────────────────────────────────

  private toOfferListDto(row: {
    offer: typeof schema.offerLetters.$inferSelect;
    postingTitle: string;
    applicationStatus: string;
  }) {
    return {
      id: row.offer.id,
      applicationId: row.offer.applicationId,
      postingTitle: row.postingTitle,
      designation: row.offer.designation,
      department: row.offer.department,
      location: row.offer.location,
      employmentType: row.offer.employmentType,
      salaryAmount: Number(row.offer.salaryAmount),
      currency: row.offer.currency,
      joiningDate: row.offer.joiningDate,
      status: row.offer.status,
      applicationStatus: row.applicationStatus,
      validUntil: row.offer.validUntil,
      sentAt: row.offer.sentAt?.toISOString() || null,
      acceptedAt: row.offer.acceptedAt?.toISOString() || null,
      rejectedAt: row.offer.rejectedAt?.toISOString() || null,
      createdAt: row.offer.createdAt.toISOString(),
    };
  }

  private toOfferDetailDto(row: {
    offer: typeof schema.offerLetters.$inferSelect;
    postingTitle: string;
    postingDescription: string;
    applicationStatus: string;
    departmentName: string | null;
  }) {
    return {
      id: row.offer.id,
      applicationId: row.offer.applicationId,
      candidateId: row.offer.candidateId,
      requisitionId: row.offer.requisitionId,
      postingTitle: row.postingTitle,
      postingDescription: row.postingDescription,
      departmentName: row.departmentName,
      designation: row.offer.designation,
      department: row.offer.department,
      location: row.offer.location,
      employmentType: row.offer.employmentType,
      salaryAmount: Number(row.offer.salaryAmount),
      currency: row.offer.currency,
      salaryBreakdown: row.offer.salaryBreakdown,
      joiningDate: row.offer.joiningDate,
      probationMonths: row.offer.probationMonths,
      reportingTo: row.offer.reportingTo,
      terms: row.offer.terms,
      benefits: row.offer.benefits,
      status: row.offer.status,
      applicationStatus: row.applicationStatus,
      validUntil: row.offer.validUntil,
      documentUrl: row.offer.documentUrl,
      negotiationHistory: row.offer.negotiationHistory,
      sentAt: row.offer.sentAt?.toISOString() || null,
      acceptedAt: row.offer.acceptedAt?.toISOString() || null,
      rejectedAt: row.offer.rejectedAt?.toISOString() || null,
      rejectionReason: row.offer.rejectionReason,
      createdAt: row.offer.createdAt.toISOString(),
      updatedAt: row.offer.updatedAt.toISOString(),
    };
  }
}
