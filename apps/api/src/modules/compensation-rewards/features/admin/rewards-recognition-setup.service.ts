import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class RewardsRecognitionSetupService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listPrograms(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.recognitionPrograms)
      .where(and(eq(schema.recognitionPrograms.orgId, orgId), eq(schema.recognitionPrograms.isActive, true)))
      .orderBy(desc(schema.recognitionPrograms.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createProgram(orgId: string, userId: string, dto: {
    name: string;
    type?: string;
    description?: string;
    frequency?: string;
    pointsValue?: number;
    budget?: string;
    nominationWorkflow?: any;
    eligibilityRules?: any;
    rewardCatalog?: any[];
  }) {
    const [row] = await this.db
      .insert(schema.recognitionPrograms)
      .values({
        orgId,
        name: dto.name,
        type: dto.type ?? 'spot',
        description: dto.description ?? null,
        frequency: dto.frequency ?? 'anytime',
        pointsValue: dto.pointsValue ?? 0,
        budget: dto.budget ?? '0',
        nominationWorkflow: dto.nominationWorkflow ?? {},
        eligibilityRules: dto.eligibilityRules ?? {},
        rewardCatalog: dto.rewardCatalog ?? [],
        createdBy: userId,
      })
      .returning();

    return { data: row };
  }

  async updateProgram(orgId: string, id: string, dto: {
    name?: string;
    type?: string;
    description?: string;
    frequency?: string;
    pointsValue?: number;
    budget?: string;
    nominationWorkflow?: any;
    eligibilityRules?: any;
    rewardCatalog?: any[];
  }) {
    const existing = await this.db
      .select()
      .from(schema.recognitionPrograms)
      .where(and(eq(schema.recognitionPrograms.id, id), eq(schema.recognitionPrograms.orgId, orgId), eq(schema.recognitionPrograms.isActive, true)));

    if (!existing.length) throw new NotFoundException('Recognition program not found');

    const [row] = await this.db
      .update(schema.recognitionPrograms)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.pointsValue !== undefined && { pointsValue: dto.pointsValue }),
        ...(dto.budget !== undefined && { budget: dto.budget }),
        ...(dto.nominationWorkflow !== undefined && { nominationWorkflow: dto.nominationWorkflow }),
        ...(dto.eligibilityRules !== undefined && { eligibilityRules: dto.eligibilityRules }),
        ...(dto.rewardCatalog !== undefined && { rewardCatalog: dto.rewardCatalog }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.recognitionPrograms.id, id), eq(schema.recognitionPrograms.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteProgram(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.recognitionPrograms)
      .where(and(eq(schema.recognitionPrograms.id, id), eq(schema.recognitionPrograms.orgId, orgId), eq(schema.recognitionPrograms.isActive, true)));

    if (!existing.length) throw new NotFoundException('Recognition program not found');

    const [row] = await this.db
      .update(schema.recognitionPrograms)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.recognitionPrograms.id, id), eq(schema.recognitionPrograms.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async listNominations(orgId: string, filters?: { status?: string; programId?: string }) {
    let query = this.db
      .select({
        nomination: schema.recognitionNominations,
        nomineeName: sql<string>`concat(nominee.first_name, ' ', coalesce(nominee.last_name, ''))`,
        nominatorName: sql<string>`concat(nominator.first_name, ' ', coalesce(nominator.last_name, ''))`,
        programName: schema.recognitionPrograms.name,
      })
      .from(schema.recognitionNominations)
      .leftJoin(schema.recognitionPrograms, eq(schema.recognitionNominations.programId, schema.recognitionPrograms.id))
      .leftJoin(sql`${schema.users} as nominee`, sql`nominee.id = ${schema.recognitionNominations.nomineeId}`)
      .leftJoin(sql`${schema.users} as nominator`, sql`nominator.id = ${schema.recognitionNominations.nominatorId}`)
      .where(and(
        eq(schema.recognitionNominations.orgId, orgId),
        eq(schema.recognitionNominations.isActive, true),
        ...(filters?.status ? [eq(schema.recognitionNominations.status, filters.status)] : []),
        ...(filters?.programId ? [eq(schema.recognitionNominations.programId, filters.programId)] : []),
      ))
      .orderBy(desc(schema.recognitionNominations.createdAt));

    const rows = await query;

    return {
      data: rows.map((r) => ({
        ...r.nomination,
        nomineeName: r.nomineeName,
        nominatorName: r.nominatorName,
        programName: r.programName,
      })),
      meta: { total: rows.length },
    };
  }

  async approveRejectNomination(orgId: string, id: string, userId: string, dto: { status: 'approved' | 'rejected'; pointsAwarded?: number }) {
    const existing = await this.db
      .select()
      .from(schema.recognitionNominations)
      .where(and(eq(schema.recognitionNominations.id, id), eq(schema.recognitionNominations.orgId, orgId), eq(schema.recognitionNominations.isActive, true)));

    if (!existing.length) throw new NotFoundException('Nomination not found');

    const [row] = await this.db
      .update(schema.recognitionNominations)
      .set({
        status: dto.status,
        approvedBy: userId,
        pointsAwarded: dto.pointsAwarded ?? existing[0].pointsAwarded,
        awardDate: dto.status === 'approved' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.recognitionNominations.id, id), eq(schema.recognitionNominations.orgId, orgId)))
      .returning();

    // If approved, credit points to nominee
    if (dto.status === 'approved' && (dto.pointsAwarded ?? 0) > 0) {
      const pointsToAward = dto.pointsAwarded ?? 0;
      const nominee = existing[0];

      // Find or create points account
      const pointsAccounts = await this.db
        .select()
        .from(schema.recognitionPoints)
        .where(and(eq(schema.recognitionPoints.orgId, orgId), eq(schema.recognitionPoints.employeeId, nominee.nomineeId)));

      let pointsAccountId: string;
      if (pointsAccounts.length) {
        pointsAccountId = pointsAccounts[0].id;
        await this.db
          .update(schema.recognitionPoints)
          .set({
            totalEarned: sql`${schema.recognitionPoints.totalEarned} + ${pointsToAward}`,
            balance: sql`${schema.recognitionPoints.balance} + ${pointsToAward}`,
            updatedAt: new Date(),
          })
          .where(eq(schema.recognitionPoints.id, pointsAccountId));
      } else {
        const [newAccount] = await this.db
          .insert(schema.recognitionPoints)
          .values({
            orgId,
            employeeId: nominee.nomineeId,
            totalEarned: pointsToAward,
            balance: pointsToAward,
          })
          .returning();
        pointsAccountId = newAccount.id;
      }

      // Record transaction
      await this.db.insert(schema.recognitionPointTransactions).values({
        orgId,
        employeeId: nominee.nomineeId,
        pointsAccountId,
        type: 'earned',
        points: pointsToAward,
        reason: `Recognition nomination approved - ${nominee.category}`,
        nominationId: id,
      });
    }

    return { data: row };
  }

  async getAnalytics(orgId: string) {
    const totalPrograms = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.recognitionPrograms)
      .where(and(eq(schema.recognitionPrograms.orgId, orgId), eq(schema.recognitionPrograms.isActive, true)));

    const totalNominations = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.recognitionNominations)
      .where(and(eq(schema.recognitionNominations.orgId, orgId), eq(schema.recognitionNominations.isActive, true)));

    const approvedNominations = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.recognitionNominations)
      .where(and(
        eq(schema.recognitionNominations.orgId, orgId),
        eq(schema.recognitionNominations.isActive, true),
        eq(schema.recognitionNominations.status, 'approved'),
      ));

    const totalPointsIssued = await this.db
      .select({ total: sql<number>`coalesce(sum(${schema.recognitionPointTransactions.points}), 0)` })
      .from(schema.recognitionPointTransactions)
      .where(and(
        eq(schema.recognitionPointTransactions.orgId, orgId),
        eq(schema.recognitionPointTransactions.type, 'earned'),
        eq(schema.recognitionPointTransactions.isActive, true),
      ));

    return {
      data: {
        totalPrograms: Number(totalPrograms[0]?.count ?? 0),
        totalNominations: Number(totalNominations[0]?.count ?? 0),
        approvedNominations: Number(approvedNominations[0]?.count ?? 0),
        pendingNominations: Number(totalNominations[0]?.count ?? 0) - Number(approvedNominations[0]?.count ?? 0),
        totalPointsIssued: Number(totalPointsIssued[0]?.total ?? 0),
      },
    };
  }
}
