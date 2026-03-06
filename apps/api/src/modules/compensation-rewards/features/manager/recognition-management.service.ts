import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class RecognitionManagementService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listTeamNominations(orgId: string, managerId: string) {
    // Get direct reports
    const teamMembers = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(and(
        eq(schema.employeeProfiles.orgId, orgId),
        eq(schema.employeeProfiles.managerId, managerId),
      ));

    const teamMemberIds = teamMembers.map((m) => m.userId);

    if (!teamMemberIds.length) {
      return { data: [], meta: { total: 0 } };
    }

    // Get nominations where team members are nominees or nominators
    const nominations = await this.db
      .select({
        nomination: schema.recognitionNominations,
        programName: schema.recognitionPrograms.name,
      })
      .from(schema.recognitionNominations)
      .leftJoin(schema.recognitionPrograms, eq(schema.recognitionNominations.programId, schema.recognitionPrograms.id))
      .where(and(
        eq(schema.recognitionNominations.orgId, orgId),
        eq(schema.recognitionNominations.isActive, true),
        or(
          sql`${schema.recognitionNominations.nomineeId} = ANY(${teamMemberIds})`,
          sql`${schema.recognitionNominations.nominatorId} = ANY(${teamMemberIds})`,
        ),
      ))
      .orderBy(desc(schema.recognitionNominations.createdAt));

    return {
      data: nominations.map((n) => ({ ...n.nomination, programName: n.programName })),
      meta: { total: nominations.length },
    };
  }

  async nominateTeamMember(orgId: string, managerId: string, dto: {
    programId: string;
    nomineeId: string;
    category?: string;
    reason: string;
  }) {
    const [row] = await this.db
      .insert(schema.recognitionNominations)
      .values({
        orgId,
        programId: dto.programId,
        nomineeId: dto.nomineeId,
        nominatorId: managerId,
        category: dto.category ?? 'general',
        reason: dto.reason,
        status: 'pending',
      })
      .returning();

    return { data: row };
  }

  async approveRejectNomination(orgId: string, managerId: string, id: string, dto: { status: 'approved' | 'rejected'; pointsAwarded?: number }) {
    const existing = await this.db
      .select()
      .from(schema.recognitionNominations)
      .where(and(
        eq(schema.recognitionNominations.id, id),
        eq(schema.recognitionNominations.orgId, orgId),
        eq(schema.recognitionNominations.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Nomination not found');

    const [row] = await this.db
      .update(schema.recognitionNominations)
      .set({
        status: dto.status,
        approvedBy: managerId,
        pointsAwarded: dto.pointsAwarded ?? existing[0].pointsAwarded,
        awardDate: dto.status === 'approved' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.recognitionNominations.id, id), eq(schema.recognitionNominations.orgId, orgId)))
      .returning();

    // Credit points if approved
    if (dto.status === 'approved' && (dto.pointsAwarded ?? 0) > 0) {
      const pointsToAward = dto.pointsAwarded ?? 0;
      const nominee = existing[0];

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

      await this.db.insert(schema.recognitionPointTransactions).values({
        orgId,
        employeeId: nominee.nomineeId,
        pointsAccountId,
        type: 'earned',
        points: pointsToAward,
        reason: `Manager recognition - ${nominee.category}`,
        nominationId: id,
      });
    }

    return { data: row };
  }

  async getTeamRecognitionDashboard(orgId: string, managerId: string) {
    // Get direct reports
    const teamMembers = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(and(
        eq(schema.employeeProfiles.orgId, orgId),
        eq(schema.employeeProfiles.managerId, managerId),
      ));

    const teamMemberIds = teamMembers.map((m) => m.userId);

    if (!teamMemberIds.length) {
      return { data: { teamSize: 0, given: 0, received: 0, totalPoints: 0 } };
    }

    // Nominations received by team members
    const received = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.recognitionNominations)
      .where(and(
        eq(schema.recognitionNominations.orgId, orgId),
        eq(schema.recognitionNominations.isActive, true),
        eq(schema.recognitionNominations.status, 'approved'),
        sql`${schema.recognitionNominations.nomineeId} = ANY(${teamMemberIds})`,
      ));

    // Nominations given by team members
    const given = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.recognitionNominations)
      .where(and(
        eq(schema.recognitionNominations.orgId, orgId),
        eq(schema.recognitionNominations.isActive, true),
        sql`${schema.recognitionNominations.nominatorId} = ANY(${teamMemberIds})`,
      ));

    // Total points earned by team
    const totalPoints = await this.db
      .select({ total: sql<number>`coalesce(sum(${schema.recognitionPoints.totalEarned}), 0)` })
      .from(schema.recognitionPoints)
      .where(and(
        eq(schema.recognitionPoints.orgId, orgId),
        sql`${schema.recognitionPoints.employeeId} = ANY(${teamMemberIds})`,
      ));

    return {
      data: {
        teamSize: teamMemberIds.length,
        given: Number(given[0]?.count ?? 0),
        received: Number(received[0]?.count ?? 0),
        totalPoints: Number(totalPoints[0]?.total ?? 0),
      },
    };
  }
}
