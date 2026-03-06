import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class OfferApprovalService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private toDto(offer: Record<string, any>) {
    return {
      ...offer,
      salaryAmount: offer.salaryAmount ? Number(offer.salaryAmount) : null,
      createdAt: offer.createdAt?.toISOString?.() ?? offer.createdAt,
      updatedAt: offer.updatedAt?.toISOString?.() ?? offer.updatedAt,
      approvedAt: offer.approvedAt?.toISOString?.() ?? offer.approvedAt ?? null,
      sentAt: offer.sentAt?.toISOString?.() ?? offer.sentAt ?? null,
      acceptedAt: offer.acceptedAt?.toISOString?.() ?? offer.acceptedAt ?? null,
      rejectedAt: offer.rejectedAt?.toISOString?.() ?? offer.rejectedAt ?? null,
    };
  }

  private isCurrentApprover(approvalChain: any, currentApproverLevel: number | null, managerId: string): boolean {
    if (!Array.isArray(approvalChain) || !currentApproverLevel) return false;

    // Find the entry at the current approver level
    const currentApprover = approvalChain.find(
      (entry: any) => entry.level === currentApproverLevel,
    );

    if (!currentApprover) return false;

    return currentApprover.approverId === managerId || currentApprover.userId === managerId;
  }

  async listPendingApprovals(orgId: string, managerId: string) {
    // Get all offers in pending_approval status, then filter by approval chain in app code
    const offers = await this.db
      .select({
        id: schema.offerLetters.id,
        applicationId: schema.offerLetters.applicationId,
        candidateId: schema.offerLetters.candidateId,
        requisitionId: schema.offerLetters.requisitionId,
        designation: schema.offerLetters.designation,
        department: schema.offerLetters.department,
        location: schema.offerLetters.location,
        employmentType: schema.offerLetters.employmentType,
        salaryAmount: schema.offerLetters.salaryAmount,
        currency: schema.offerLetters.currency,
        salaryBreakdown: schema.offerLetters.salaryBreakdown,
        joiningDate: schema.offerLetters.joiningDate,
        approvalChain: schema.offerLetters.approvalChain,
        currentApproverLevel: schema.offerLetters.currentApproverLevel,
        status: schema.offerLetters.status,
        candidateFirstName: schema.candidates.firstName,
        candidateLastName: schema.candidates.lastName,
        candidateEmail: schema.candidates.email,
        requisitionTitle: schema.jobRequisitions.title,
        createdAt: schema.offerLetters.createdAt,
        updatedAt: schema.offerLetters.updatedAt,
      })
      .from(schema.offerLetters)
      .innerJoin(schema.candidates, eq(schema.offerLetters.candidateId, schema.candidates.id))
      .innerJoin(schema.jobRequisitions, eq(schema.offerLetters.requisitionId, schema.jobRequisitions.id))
      .where(
        and(
          eq(schema.offerLetters.orgId, orgId),
          eq(schema.offerLetters.status, 'pending_approval'),
        ),
      )
      .orderBy(desc(schema.offerLetters.createdAt));

    // Filter to offers where this manager is the current approver
    const pendingForManager = offers.filter((offer) =>
      this.isCurrentApprover(offer.approvalChain, offer.currentApproverLevel, managerId),
    );

    return {
      data: pendingForManager.map((offer) => ({
        ...this.toDto(offer),
        candidateName: `${offer.candidateFirstName} ${offer.candidateLastName ?? ''}`.trim(),
        candidateEmail: offer.candidateEmail,
        requisitionTitle: offer.requisitionTitle,
      })),
      total: pendingForManager.length,
    };
  }

  async getOfferDetail(orgId: string, managerId: string, offerId: string) {
    const [offer] = await this.db
      .select({
        id: schema.offerLetters.id,
        applicationId: schema.offerLetters.applicationId,
        candidateId: schema.offerLetters.candidateId,
        requisitionId: schema.offerLetters.requisitionId,
        designation: schema.offerLetters.designation,
        department: schema.offerLetters.department,
        location: schema.offerLetters.location,
        employmentType: schema.offerLetters.employmentType,
        salaryAmount: schema.offerLetters.salaryAmount,
        currency: schema.offerLetters.currency,
        salaryBreakdown: schema.offerLetters.salaryBreakdown,
        joiningDate: schema.offerLetters.joiningDate,
        probationMonths: schema.offerLetters.probationMonths,
        reportingTo: schema.offerLetters.reportingTo,
        terms: schema.offerLetters.terms,
        benefits: schema.offerLetters.benefits,
        templateId: schema.offerLetters.templateId,
        approvalChain: schema.offerLetters.approvalChain,
        currentApproverLevel: schema.offerLetters.currentApproverLevel,
        approvedBy: schema.offerLetters.approvedBy,
        approvedAt: schema.offerLetters.approvedAt,
        status: schema.offerLetters.status,
        sentAt: schema.offerLetters.sentAt,
        acceptedAt: schema.offerLetters.acceptedAt,
        rejectedAt: schema.offerLetters.rejectedAt,
        rejectionReason: schema.offerLetters.rejectionReason,
        negotiationHistory: schema.offerLetters.negotiationHistory,
        validUntil: schema.offerLetters.validUntil,
        documentUrl: schema.offerLetters.documentUrl,
        createdBy: schema.offerLetters.createdBy,
        metadata: schema.offerLetters.metadata,
        candidateFirstName: schema.candidates.firstName,
        candidateLastName: schema.candidates.lastName,
        candidateEmail: schema.candidates.email,
        candidatePhone: schema.candidates.phone,
        candidateCurrentTitle: schema.candidates.currentTitle,
        candidateCurrentCompany: schema.candidates.currentCompany,
        candidateExperience: schema.candidates.experienceYears,
        candidateSkills: schema.candidates.skills,
        candidateSalaryExpectation: schema.candidates.salaryExpectation,
        requisitionTitle: schema.jobRequisitions.title,
        createdAt: schema.offerLetters.createdAt,
        updatedAt: schema.offerLetters.updatedAt,
      })
      .from(schema.offerLetters)
      .innerJoin(schema.candidates, eq(schema.offerLetters.candidateId, schema.candidates.id))
      .innerJoin(schema.jobRequisitions, eq(schema.offerLetters.requisitionId, schema.jobRequisitions.id))
      .where(
        and(
          eq(schema.offerLetters.id, offerId),
          eq(schema.offerLetters.orgId, orgId),
        ),
      );

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Get interview summary for this application
    const interviews = await this.db
      .select({
        id: schema.interviews.id,
        interviewType: schema.interviews.interviewType,
        status: schema.interviews.status,
        overallScore: schema.interviews.overallScore,
        decision: schema.interviews.decision,
        scheduledAt: schema.interviews.scheduledAt,
        stageName: schema.recruitmentPipelineStages.name,
      })
      .from(schema.interviews)
      .leftJoin(
        schema.recruitmentPipelineStages,
        eq(schema.interviews.stageId, schema.recruitmentPipelineStages.id),
      )
      .where(
        and(
          eq(schema.interviews.applicationId, offer.applicationId),
          eq(schema.interviews.orgId, orgId),
        ),
      )
      .orderBy(schema.interviews.scheduledAt);

    return {
      ...this.toDto(offer),
      candidateName: `${offer.candidateFirstName} ${offer.candidateLastName ?? ''}`.trim(),
      candidateEmail: offer.candidateEmail,
      candidatePhone: offer.candidatePhone,
      candidateCurrentTitle: offer.candidateCurrentTitle,
      candidateCurrentCompany: offer.candidateCurrentCompany,
      candidateExperience: offer.candidateExperience ? Number(offer.candidateExperience) : null,
      candidateSkills: offer.candidateSkills,
      candidateSalaryExpectation: offer.candidateSalaryExpectation ? Number(offer.candidateSalaryExpectation) : null,
      requisitionTitle: offer.requisitionTitle,
      interviewSummary: interviews.map((i) => ({
        id: i.id,
        stageName: i.stageName,
        interviewType: i.interviewType,
        status: i.status,
        overallScore: i.overallScore ? Number(i.overallScore) : null,
        decision: i.decision,
        scheduledAt: i.scheduledAt?.toISOString?.() ?? i.scheduledAt,
      })),
    };
  }

  async approveOffer(orgId: string, managerId: string, offerId: string, body: Record<string, any>) {
    const [offer] = await this.db
      .select({
        id: schema.offerLetters.id,
        approvalChain: schema.offerLetters.approvalChain,
        currentApproverLevel: schema.offerLetters.currentApproverLevel,
        status: schema.offerLetters.status,
      })
      .from(schema.offerLetters)
      .where(
        and(
          eq(schema.offerLetters.id, offerId),
          eq(schema.offerLetters.orgId, orgId),
        ),
      );

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'pending_approval') {
      throw new BadRequestException('Offer is not in pending approval status');
    }

    if (!this.isCurrentApprover(offer.approvalChain, offer.currentApproverLevel, managerId)) {
      throw new BadRequestException('You are not the current approver for this offer');
    }

    const approvalChain = (offer.approvalChain as any[]) ?? [];
    const currentLevel = offer.currentApproverLevel ?? 1;

    // Mark current level as approved
    const updatedChain = approvalChain.map((entry: any) => {
      if (entry.level === currentLevel) {
        return {
          ...entry,
          status: 'approved',
          approvedBy: managerId,
          approvedAt: new Date().toISOString(),
          comments: body.comments ?? null,
        };
      }
      return entry;
    });

    // Check if there are more levels
    const maxLevel = Math.max(...approvalChain.map((e: any) => e.level ?? 0));
    const isFullyApproved = currentLevel >= maxLevel;

    const updateData: Record<string, any> = {
      approvalChain: updatedChain,
      updatedAt: new Date(),
    };

    if (isFullyApproved) {
      updateData.status = 'approved';
      updateData.approvedBy = managerId;
      updateData.approvedAt = new Date();
    } else {
      updateData.currentApproverLevel = currentLevel + 1;
    }

    await this.db
      .update(schema.offerLetters)
      .set(updateData)
      .where(eq(schema.offerLetters.id, offerId));

    return {
      message: isFullyApproved ? 'Offer fully approved' : 'Approval recorded, advancing to next level',
      offerId,
      isFullyApproved,
      newLevel: isFullyApproved ? null : currentLevel + 1,
    };
  }

  async rejectOffer(orgId: string, managerId: string, offerId: string, body: Record<string, any>) {
    const [offer] = await this.db
      .select({
        id: schema.offerLetters.id,
        approvalChain: schema.offerLetters.approvalChain,
        currentApproverLevel: schema.offerLetters.currentApproverLevel,
        status: schema.offerLetters.status,
      })
      .from(schema.offerLetters)
      .where(
        and(
          eq(schema.offerLetters.id, offerId),
          eq(schema.offerLetters.orgId, orgId),
        ),
      );

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'pending_approval') {
      throw new BadRequestException('Offer is not in pending approval status');
    }

    if (!this.isCurrentApprover(offer.approvalChain, offer.currentApproverLevel, managerId)) {
      throw new BadRequestException('You are not the current approver for this offer');
    }

    const approvalChain = (offer.approvalChain as any[]) ?? [];
    const currentLevel = offer.currentApproverLevel ?? 1;

    // Mark current level as rejected
    const updatedChain = approvalChain.map((entry: any) => {
      if (entry.level === currentLevel) {
        return {
          ...entry,
          status: 'rejected',
          rejectedBy: managerId,
          rejectedAt: new Date().toISOString(),
          reason: body.reason ?? null,
          comments: body.comments ?? null,
        };
      }
      return entry;
    });

    await this.db
      .update(schema.offerLetters)
      .set({
        approvalChain: updatedChain,
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: body.reason ?? 'Rejected by approver',
        updatedAt: new Date(),
      })
      .where(eq(schema.offerLetters.id, offerId));

    return {
      message: 'Offer rejected',
      offerId,
      reason: body.reason ?? null,
    };
  }

  async suggestCounterOffer(orgId: string, managerId: string, offerId: string, body: Record<string, any>) {
    const [offer] = await this.db
      .select({
        id: schema.offerLetters.id,
        approvalChain: schema.offerLetters.approvalChain,
        currentApproverLevel: schema.offerLetters.currentApproverLevel,
        status: schema.offerLetters.status,
        negotiationHistory: schema.offerLetters.negotiationHistory,
        salaryAmount: schema.offerLetters.salaryAmount,
      })
      .from(schema.offerLetters)
      .where(
        and(
          eq(schema.offerLetters.id, offerId),
          eq(schema.offerLetters.orgId, orgId),
        ),
      );

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'pending_approval' && offer.status !== 'negotiation') {
      throw new BadRequestException('Offer is not in a state that allows counter-offers');
    }

    const counterEntry = {
      suggestedBy: managerId,
      suggestedAt: new Date().toISOString(),
      originalSalary: offer.salaryAmount ? Number(offer.salaryAmount) : null,
      proposedSalary: body.proposedSalary ?? null,
      proposedJoiningDate: body.proposedJoiningDate ?? null,
      proposedDesignation: body.proposedDesignation ?? null,
      proposedBenefits: body.proposedBenefits ?? null,
      reason: body.reason ?? null,
      comments: body.comments ?? null,
    };

    const existingHistory = (offer.negotiationHistory as any[]) ?? [];
    const updatedHistory = [...existingHistory, counterEntry];

    await this.db
      .update(schema.offerLetters)
      .set({
        negotiationHistory: updatedHistory,
        status: 'negotiation',
        updatedAt: new Date(),
      })
      .where(eq(schema.offerLetters.id, offerId));

    return {
      message: 'Counter-offer suggestion recorded',
      offerId,
      counterOffer: counterEntry,
    };
  }

  async trackAcceptanceStatus(orgId: string, managerId: string) {
    // Get offers that this manager has approved (check approval chain for managerId with approved status)
    const offers = await this.db
      .select({
        id: schema.offerLetters.id,
        applicationId: schema.offerLetters.applicationId,
        requisitionId: schema.offerLetters.requisitionId,
        designation: schema.offerLetters.designation,
        department: schema.offerLetters.department,
        salaryAmount: schema.offerLetters.salaryAmount,
        currency: schema.offerLetters.currency,
        joiningDate: schema.offerLetters.joiningDate,
        approvalChain: schema.offerLetters.approvalChain,
        status: schema.offerLetters.status,
        sentAt: schema.offerLetters.sentAt,
        acceptedAt: schema.offerLetters.acceptedAt,
        rejectedAt: schema.offerLetters.rejectedAt,
        rejectionReason: schema.offerLetters.rejectionReason,
        validUntil: schema.offerLetters.validUntil,
        candidateFirstName: schema.candidates.firstName,
        candidateLastName: schema.candidates.lastName,
        candidateEmail: schema.candidates.email,
        requisitionTitle: schema.jobRequisitions.title,
        createdAt: schema.offerLetters.createdAt,
        updatedAt: schema.offerLetters.updatedAt,
      })
      .from(schema.offerLetters)
      .innerJoin(schema.candidates, eq(schema.offerLetters.candidateId, schema.candidates.id))
      .innerJoin(schema.jobRequisitions, eq(schema.offerLetters.requisitionId, schema.jobRequisitions.id))
      .where(eq(schema.offerLetters.orgId, orgId))
      .orderBy(desc(schema.offerLetters.updatedAt));

    // Filter offers where this manager appears in the approval chain as an approver
    const managerApprovedOffers = offers.filter((offer) => {
      const chain = (offer.approvalChain as any[]) ?? [];
      return chain.some(
        (entry: any) =>
          (entry.approverId === managerId || entry.userId === managerId) &&
          entry.status === 'approved',
      );
    });

    const statusBreakdown: Record<string, number> = {};
    for (const offer of managerApprovedOffers) {
      statusBreakdown[offer.status] = (statusBreakdown[offer.status] ?? 0) + 1;
    }

    return {
      summary: {
        totalOffers: managerApprovedOffers.length,
        statusBreakdown,
      },
      data: managerApprovedOffers.map((offer) => ({
        offerId: offer.id,
        candidateName: `${offer.candidateFirstName} ${offer.candidateLastName ?? ''}`.trim(),
        candidateEmail: offer.candidateEmail,
        requisitionId: offer.requisitionId,
        requisitionTitle: offer.requisitionTitle,
        designation: offer.designation,
        department: offer.department,
        salary: offer.salaryAmount ? Number(offer.salaryAmount) : null,
        currency: offer.currency,
        joiningDate: offer.joiningDate,
        validUntil: offer.validUntil,
        status: offer.status,
        sentAt: offer.sentAt?.toISOString?.() ?? offer.sentAt ?? null,
        acceptedAt: offer.acceptedAt?.toISOString?.() ?? offer.acceptedAt ?? null,
        rejectedAt: offer.rejectedAt?.toISOString?.() ?? offer.rejectedAt ?? null,
        rejectionReason: offer.rejectionReason,
        createdAt: offer.createdAt?.toISOString?.() ?? offer.createdAt,
        updatedAt: offer.updatedAt?.toISOString?.() ?? offer.updatedAt,
      })),
    };
  }
}
