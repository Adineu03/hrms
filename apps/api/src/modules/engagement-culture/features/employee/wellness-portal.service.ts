import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class WellnessPortalService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listAvailablePrograms(orgId: string) {
    const programs = await this.db
      .select()
      .from(schema.wellnessPrograms)
      .where(and(
        eq(schema.wellnessPrograms.orgId, orgId),
        eq(schema.wellnessPrograms.isActive, true),
        eq(schema.wellnessPrograms.status, 'active'),
      ))
      .orderBy(desc(schema.wellnessPrograms.createdAt));

    return { data: programs, meta: { total: programs.length } };
  }

  async enrollInProgram(orgId: string, userId: string, programId: string) {
    // Check program exists and is active
    const programs = await this.db
      .select()
      .from(schema.wellnessPrograms)
      .where(and(
        eq(schema.wellnessPrograms.id, programId),
        eq(schema.wellnessPrograms.orgId, orgId),
        eq(schema.wellnessPrograms.isActive, true),
        eq(schema.wellnessPrograms.status, 'active'),
      ));

    if (!programs.length) throw new NotFoundException('Wellness program not found or not active');

    const program = programs[0];

    // Check if already enrolled
    const existingEnrollment = await this.db
      .select()
      .from(schema.wellnessParticipations)
      .where(and(
        eq(schema.wellnessParticipations.orgId, orgId),
        eq(schema.wellnessParticipations.programId, programId),
        eq(schema.wellnessParticipations.employeeId, userId),
        eq(schema.wellnessParticipations.isActive, true),
      ));

    if (existingEnrollment.length) throw new BadRequestException('Already enrolled in this program');

    // Check max participants
    if (program.maxParticipants && program.currentParticipants >= program.maxParticipants) {
      throw new BadRequestException('Program has reached maximum capacity');
    }

    const [row] = await this.db
      .insert(schema.wellnessParticipations)
      .values({
        orgId,
        programId,
        employeeId: userId,
        status: 'enrolled',
      })
      .returning();

    // Increment participant count
    await this.db
      .update(schema.wellnessPrograms)
      .set({
        currentParticipants: sql`${schema.wellnessPrograms.currentParticipants} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.wellnessPrograms.id, programId));

    return { data: row };
  }

  async updateProgress(orgId: string, userId: string, programId: string, progress: number) {
    const existing = await this.db
      .select()
      .from(schema.wellnessParticipations)
      .where(and(
        eq(schema.wellnessParticipations.orgId, orgId),
        eq(schema.wellnessParticipations.programId, programId),
        eq(schema.wellnessParticipations.employeeId, userId),
        eq(schema.wellnessParticipations.isActive, true),
      ));

    if (!existing.length) throw new NotFoundException('Enrollment not found');

    const updates: Record<string, any> = {
      progress: Math.min(Math.max(progress, 0), 100),
      updatedAt: new Date(),
    };

    if (progress >= 100) {
      updates.status = 'completed';
      updates.completedAt = new Date();
      updates.pointsEarned = 100; // Award completion points
    } else if (progress > 0) {
      updates.status = 'in_progress';
    }

    const [row] = await this.db
      .update(schema.wellnessParticipations)
      .set(updates)
      .where(and(
        eq(schema.wellnessParticipations.orgId, orgId),
        eq(schema.wellnessParticipations.programId, programId),
        eq(schema.wellnessParticipations.employeeId, userId),
      ))
      .returning();

    return { data: row };
  }

  async getMyParticipations(orgId: string, userId: string) {
    const participations = await this.db
      .select({
        participation: schema.wellnessParticipations,
        programName: schema.wellnessPrograms.name,
        programType: schema.wellnessPrograms.type,
        programStatus: schema.wellnessPrograms.status,
      })
      .from(schema.wellnessParticipations)
      .leftJoin(schema.wellnessPrograms, eq(schema.wellnessParticipations.programId, schema.wellnessPrograms.id))
      .where(and(
        eq(schema.wellnessParticipations.orgId, orgId),
        eq(schema.wellnessParticipations.employeeId, userId),
        eq(schema.wellnessParticipations.isActive, true),
      ))
      .orderBy(desc(schema.wellnessParticipations.enrolledAt));

    return {
      data: participations.map((p) => ({
        ...p.participation,
        programName: p.programName,
        programType: p.programType,
        programStatus: p.programStatus,
      })),
      meta: { total: participations.length },
    };
  }

  async getActiveChallenges(orgId: string) {
    const challenges = await this.db
      .select()
      .from(schema.wellnessPrograms)
      .where(and(
        eq(schema.wellnessPrograms.orgId, orgId),
        eq(schema.wellnessPrograms.isActive, true),
        eq(schema.wellnessPrograms.status, 'active'),
        eq(schema.wellnessPrograms.type, 'challenge'),
      ))
      .orderBy(desc(schema.wellnessPrograms.createdAt));

    return { data: challenges, meta: { total: challenges.length } };
  }

  async getWellnessPoints(orgId: string, userId: string) {
    const participations = await this.db
      .select({
        totalPoints: sql<number>`coalesce(sum(${schema.wellnessParticipations.pointsEarned}), 0)`,
        completedPrograms: sql<number>`count(case when ${schema.wellnessParticipations.status} = 'completed' then 1 end)`,
        activePrograms: sql<number>`count(case when ${schema.wellnessParticipations.status} IN ('enrolled', 'in_progress') then 1 end)`,
      })
      .from(schema.wellnessParticipations)
      .where(and(
        eq(schema.wellnessParticipations.orgId, orgId),
        eq(schema.wellnessParticipations.employeeId, userId),
        eq(schema.wellnessParticipations.isActive, true),
      ));

    return {
      data: {
        totalPoints: Number(participations[0]?.totalPoints ?? 0),
        completedPrograms: Number(participations[0]?.completedPrograms ?? 0),
        activePrograms: Number(participations[0]?.activePrograms ?? 0),
      },
    };
  }
}
