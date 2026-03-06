import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyExitProcessService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Helper: Get offboarding record ──────────────────────────────────
  private async getOffboarding(orgId: string, employeeId: string) {
    const [offboarding] = await this.db
      .select()
      .from(schema.employeeOffboardings)
      .where(
        and(
          eq(schema.employeeOffboardings.orgId, orgId),
          eq(schema.employeeOffboardings.employeeId, employeeId),
          eq(schema.employeeOffboardings.isActive, true),
        ),
      )
      .orderBy(desc(schema.employeeOffboardings.createdAt))
      .limit(1);

    return offboarding || null;
  }

  // ── View My Exit Overview ───────────────────────────────────────────
  async getOverview(orgId: string, employeeId: string) {
    const offboarding = await this.getOffboarding(orgId, employeeId);

    if (!offboarding) {
      return { hasActiveExit: false, message: 'No active exit process found' };
    }

    return {
      hasActiveExit: true,
      id: offboarding.id,
      exitType: offboarding.exitType,
      exitReason: offboarding.exitReason,
      resignationDate: offboarding.resignationDate,
      lastWorkingDate: offboarding.lastWorkingDate,
      noticePeriodDays: offboarding.noticePeriodDays,
      status: offboarding.status,
      clearanceStatus: offboarding.clearanceStatus,
      assetReturnStatus: offboarding.assetReturnStatus,
      handoverStatus: offboarding.handoverStatus,
      settlementStatus: offboarding.settlementStatus,
    };
  }

  // ── Submit Resignation ──────────────────────────────────────────────
  async submitResignation(orgId: string, employeeId: string, data: Record<string, any>) {
    const existing = await this.getOffboarding(orgId, employeeId);
    if (existing) {
      throw new BadRequestException('An active exit process already exists');
    }

    const [offboarding] = await this.db
      .insert(schema.employeeOffboardings)
      .values({
        orgId,
        employeeId,
        exitType: 'resignation',
        exitReason: data.reason || null,
        resignationDate: data.resignationDate || new Date().toISOString().split('T')[0],
        lastWorkingDate: data.lastWorkingDate || null,
        noticePeriodDays: data.noticePeriodDays || null,
        status: 'initiated',
        initiatedBy: employeeId,
        metadata: {
          resignationLetter: data.letter || null,
          submittedAt: new Date().toISOString(),
        },
      })
      .returning();

    return {
      id: offboarding.id,
      exitType: offboarding.exitType,
      status: offboarding.status,
      resignationDate: offboarding.resignationDate,
      lastWorkingDate: offboarding.lastWorkingDate,
      createdAt: offboarding.createdAt.toISOString(),
    };
  }

  // ── Track Exit Clearance Status ─────────────────────────────────────
  async getClearanceStatus(orgId: string, employeeId: string) {
    const offboarding = await this.getOffboarding(orgId, employeeId);
    if (!offboarding) {
      throw new NotFoundException('No active exit process found');
    }

    const clearance = (offboarding.clearanceStatus as Record<string, any>) || {};

    return {
      offboardingId: offboarding.id,
      status: offboarding.status,
      clearance,
    };
  }

  // ── Asset Return Checklist ──────────────────────────────────────────
  async getAssetChecklist(orgId: string, employeeId: string) {
    const offboarding = await this.getOffboarding(orgId, employeeId);
    if (!offboarding) {
      throw new NotFoundException('No active exit process found');
    }

    const assets = (offboarding.assetReturnStatus as Array<Record<string, any>>) || [];

    return {
      offboardingId: offboarding.id,
      assets: assets.map((a, i) => ({
        index: i,
        assetId: a.assetId || null,
        name: a.name || `Asset ${i + 1}`,
        type: a.type || 'other',
        serialNumber: a.serialNumber || null,
        status: a.status || 'pending',
        returnedAt: a.returnedAt || null,
        notes: a.notes || null,
      })),
    };
  }

  // ── Mark Asset as Returned ──────────────────────────────────────────
  async markAssetReturned(orgId: string, employeeId: string, assetIndex: string, data: Record<string, any>) {
    const offboarding = await this.getOffboarding(orgId, employeeId);
    if (!offboarding) {
      throw new NotFoundException('No active exit process found');
    }

    const assets = (offboarding.assetReturnStatus as Array<Record<string, any>>) || [];
    const idx = parseInt(assetIndex, 10);

    if (isNaN(idx) || idx < 0 || idx >= assets.length) {
      throw new NotFoundException('Asset not found in checklist');
    }

    assets[idx].status = 'returned';
    assets[idx].returnedAt = new Date().toISOString();
    assets[idx].notes = data.notes || assets[idx].notes;

    await this.db
      .update(schema.employeeOffboardings)
      .set({ assetReturnStatus: assets, updatedAt: new Date() })
      .where(eq(schema.employeeOffboardings.id, offboarding.id));

    return { assetIndex: idx, status: 'returned', returnedAt: assets[idx].returnedAt };
  }

  // ── View Knowledge Transfer Tasks ───────────────────────────────────
  async getKnowledgeTransfers(orgId: string, employeeId: string) {
    const transfers = await this.db
      .select()
      .from(schema.knowledgeTransfers)
      .where(
        and(
          eq(schema.knowledgeTransfers.orgId, orgId),
          eq(schema.knowledgeTransfers.employeeId, employeeId),
        ),
      )
      .orderBy(desc(schema.knowledgeTransfers.createdAt));

    return {
      transfers: transfers.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        assignedTo: t.assignedTo,
        status: t.status,
        dueDate: t.dueDate,
        completedAt: t.completedAt?.toISOString() || null,
        items: t.items,
        pendingItems: t.pendingItems,
      })),
    };
  }

  // ── View Final Settlement Estimate ──────────────────────────────────
  async getSettlementEstimate(orgId: string, employeeId: string) {
    const offboarding = await this.getOffboarding(orgId, employeeId);
    if (!offboarding) {
      throw new NotFoundException('No active exit process found');
    }

    return {
      offboardingId: offboarding.id,
      settlementStatus: offboarding.settlementStatus,
      estimate: offboarding.settlementEstimate || {},
      lastWorkingDate: offboarding.lastWorkingDate,
    };
  }

  // ── Get Exit Survey Form ────────────────────────────────────────────
  async getExitSurvey(orgId: string, employeeId: string) {
    const offboarding = await this.getOffboarding(orgId, employeeId);
    if (!offboarding) {
      throw new NotFoundException('No active exit process found');
    }

    const [interview] = await this.db
      .select()
      .from(schema.exitInterviews)
      .where(
        and(
          eq(schema.exitInterviews.orgId, orgId),
          eq(schema.exitInterviews.employeeId, employeeId),
          eq(schema.exitInterviews.offboardingId, offboarding.id),
        ),
      )
      .orderBy(desc(schema.exitInterviews.createdAt))
      .limit(1);

    if (interview) {
      return {
        interviewId: interview.id,
        status: interview.status,
        questionnaire: interview.questionnaire,
        responses: interview.responses,
        scheduledAt: interview.scheduledAt?.toISOString() || null,
      };
    }

    return {
      interviewId: null,
      status: 'not_scheduled',
      questionnaire: [],
      responses: {},
      exitSurveyResponses: offboarding.exitSurveyResponses,
    };
  }

  // ── Submit Exit Survey ──────────────────────────────────────────────
  async submitExitSurvey(orgId: string, employeeId: string, data: Record<string, any>) {
    const offboarding = await this.getOffboarding(orgId, employeeId);
    if (!offboarding) {
      throw new NotFoundException('No active exit process found');
    }

    // Update offboarding with survey responses
    await this.db
      .update(schema.employeeOffboardings)
      .set({
        exitSurveyResponses: data,
        updatedAt: new Date(),
      })
      .where(eq(schema.employeeOffboardings.id, offboarding.id));

    // Also update exit interview if exists
    const [interview] = await this.db
      .select()
      .from(schema.exitInterviews)
      .where(
        and(
          eq(schema.exitInterviews.orgId, orgId),
          eq(schema.exitInterviews.employeeId, employeeId),
          eq(schema.exitInterviews.offboardingId, offboarding.id),
        ),
      )
      .limit(1);

    if (interview) {
      await this.db
        .update(schema.exitInterviews)
        .set({
          responses: data.responses || data,
          sentiment: data.sentiment || null,
          overallRating: data.overallRating || null,
          exitReasons: data.exitReasons || [],
          improvements: data.improvements || null,
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.exitInterviews.id, interview.id));
    }

    return { message: 'Exit survey submitted', offboardingId: offboarding.id };
  }

  // ── Download Experience/Relieving Letter ────────────────────────────
  async getLetters(orgId: string, employeeId: string) {
    const offboarding = await this.getOffboarding(orgId, employeeId);
    if (!offboarding) {
      throw new NotFoundException('No active exit process found');
    }

    const letters: Array<Record<string, any>> = [];

    if (offboarding.experienceLetterUrl) {
      letters.push({
        type: 'experience_letter',
        url: offboarding.experienceLetterUrl,
        name: 'Experience Letter',
      });
    }

    if (offboarding.relievingLetterUrl) {
      letters.push({
        type: 'relieving_letter',
        url: offboarding.relievingLetterUrl,
        name: 'Relieving Letter',
      });
    }

    // Also check documents table
    const docs = await this.db
      .select()
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.orgId, orgId),
          eq(schema.documents.employeeId, employeeId),
          eq(schema.documents.category, 'letters'),
        ),
      )
      .orderBy(desc(schema.documents.createdAt));

    for (const doc of docs) {
      letters.push({
        type: 'document',
        documentId: doc.id,
        url: doc.fileUrl,
        name: doc.name,
        createdAt: doc.createdAt.toISOString(),
      });
    }

    return { offboardingId: offboarding.id, letters };
  }
}
