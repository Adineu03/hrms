import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class RecognitionAwardsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getRecognitionsReceived(orgId: string, userId: string) {
    const nominations = await this.db
      .select({
        nomination: schema.recognitionNominations,
        programName: schema.recognitionPrograms.name,
        programType: schema.recognitionPrograms.type,
        nominatorName: sql<string>`concat(${schema.users.firstName}, ' ', coalesce(${schema.users.lastName}, ''))`,
      })
      .from(schema.recognitionNominations)
      .leftJoin(schema.recognitionPrograms, eq(schema.recognitionNominations.programId, schema.recognitionPrograms.id))
      .leftJoin(schema.users, eq(schema.recognitionNominations.nominatorId, schema.users.id))
      .where(and(
        eq(schema.recognitionNominations.orgId, orgId),
        eq(schema.recognitionNominations.nomineeId, userId),
        eq(schema.recognitionNominations.isActive, true),
        eq(schema.recognitionNominations.status, 'approved'),
      ))
      .orderBy(desc(schema.recognitionNominations.createdAt));

    return {
      data: nominations.map((n) => ({
        ...n.nomination,
        programName: n.programName,
        programType: n.programType,
        nominatorName: n.nominatorName,
      })),
      meta: { total: nominations.length },
    };
  }

  async getRecognitionWall(orgId: string) {
    const nominations = await this.db
      .select({
        nomination: schema.recognitionNominations,
        programName: schema.recognitionPrograms.name,
        programType: schema.recognitionPrograms.type,
        nomineeName: sql<string>`concat(nominee.first_name, ' ', coalesce(nominee.last_name, ''))`,
        nominatorName: sql<string>`concat(nominator.first_name, ' ', coalesce(nominator.last_name, ''))`,
      })
      .from(schema.recognitionNominations)
      .leftJoin(schema.recognitionPrograms, eq(schema.recognitionNominations.programId, schema.recognitionPrograms.id))
      .leftJoin(sql`${schema.users} as nominee`, sql`nominee.id = ${schema.recognitionNominations.nomineeId}`)
      .leftJoin(sql`${schema.users} as nominator`, sql`nominator.id = ${schema.recognitionNominations.nominatorId}`)
      .where(and(
        eq(schema.recognitionNominations.orgId, orgId),
        eq(schema.recognitionNominations.isActive, true),
        eq(schema.recognitionNominations.status, 'approved'),
      ))
      .orderBy(desc(schema.recognitionNominations.awardDate))
      .limit(50);

    return {
      data: nominations.map((n) => ({
        ...n.nomination,
        programName: n.programName,
        programType: n.programType,
        nomineeName: n.nomineeName,
        nominatorName: n.nominatorName,
      })),
      meta: { total: nominations.length },
    };
  }

  async nominatePeer(orgId: string, userId: string, dto: {
    programId: string;
    nomineeId: string;
    category?: string;
    reason: string;
  }) {
    if (dto.nomineeId === userId) {
      throw new BadRequestException('Cannot nominate yourself');
    }

    const [row] = await this.db
      .insert(schema.recognitionNominations)
      .values({
        orgId,
        programId: dto.programId,
        nomineeId: dto.nomineeId,
        nominatorId: userId,
        category: dto.category ?? 'general',
        reason: dto.reason,
        status: 'pending',
      })
      .returning();

    return { data: row };
  }

  async getPointsBalance(orgId: string, userId: string) {
    const accounts = await this.db
      .select()
      .from(schema.recognitionPoints)
      .where(and(
        eq(schema.recognitionPoints.orgId, orgId),
        eq(schema.recognitionPoints.employeeId, userId),
      ));

    return {
      data: {
        totalEarned: accounts[0]?.totalEarned ?? 0,
        totalRedeemed: accounts[0]?.totalRedeemed ?? 0,
        balance: accounts[0]?.balance ?? 0,
      },
    };
  }

  async getPointTransactions(orgId: string, userId: string) {
    const transactions = await this.db
      .select()
      .from(schema.recognitionPointTransactions)
      .where(and(
        eq(schema.recognitionPointTransactions.orgId, orgId),
        eq(schema.recognitionPointTransactions.employeeId, userId),
        eq(schema.recognitionPointTransactions.isActive, true),
      ))
      .orderBy(desc(schema.recognitionPointTransactions.createdAt));

    return { data: transactions, meta: { total: transactions.length } };
  }

  async redeemPoints(orgId: string, userId: string, dto: { points: number; redeemedItem: string }) {
    // Get current points balance
    const accounts = await this.db
      .select()
      .from(schema.recognitionPoints)
      .where(and(
        eq(schema.recognitionPoints.orgId, orgId),
        eq(schema.recognitionPoints.employeeId, userId),
      ));

    if (!accounts.length || accounts[0].balance < dto.points) {
      throw new BadRequestException('Insufficient points balance');
    }

    const account = accounts[0];

    // Deduct points
    await this.db
      .update(schema.recognitionPoints)
      .set({
        totalRedeemed: sql`${schema.recognitionPoints.totalRedeemed} + ${dto.points}`,
        balance: sql`${schema.recognitionPoints.balance} - ${dto.points}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.recognitionPoints.id, account.id));

    // Record transaction
    const [transaction] = await this.db
      .insert(schema.recognitionPointTransactions)
      .values({
        orgId,
        employeeId: userId,
        pointsAccountId: account.id,
        type: 'redeemed',
        points: dto.points,
        reason: `Redeemed for: ${dto.redeemedItem}`,
        redeemedItem: dto.redeemedItem,
      })
      .returning();

    return {
      data: {
        transaction,
        updatedBalance: account.balance - dto.points,
      },
    };
  }
}
