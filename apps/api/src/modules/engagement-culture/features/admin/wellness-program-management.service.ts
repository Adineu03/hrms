import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class WellnessProgramManagementService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listWellnessPrograms(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.wellnessPrograms)
      .where(and(eq(schema.wellnessPrograms.orgId, orgId), eq(schema.wellnessPrograms.isActive, true)))
      .orderBy(desc(schema.wellnessPrograms.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async createWellnessProgram(orgId: string, dto: { name: string; type?: string; description?: string; startDate?: string; endDate?: string; budget?: string; maxParticipants?: number; resources?: any[]; schedule?: any }) {
    const [row] = await this.db
      .insert(schema.wellnessPrograms)
      .values({
        orgId,
        name: dto.name,
        type: dto.type ?? 'general',
        description: dto.description ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        budget: dto.budget ?? '0',
        maxParticipants: dto.maxParticipants ?? null,
        resources: dto.resources ?? [],
        schedule: dto.schedule ?? {},
      })
      .returning();

    return { data: row };
  }

  async updateWellnessProgram(orgId: string, id: string, dto: { name?: string; type?: string; description?: string; startDate?: string; endDate?: string; budget?: string; maxParticipants?: number; resources?: any[]; schedule?: any }) {
    const existing = await this.db
      .select()
      .from(schema.wellnessPrograms)
      .where(and(eq(schema.wellnessPrograms.id, id), eq(schema.wellnessPrograms.orgId, orgId), eq(schema.wellnessPrograms.isActive, true)));

    if (!existing.length) throw new NotFoundException('Wellness program not found');

    const [row] = await this.db
      .update(schema.wellnessPrograms)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.budget !== undefined && { budget: dto.budget }),
        ...(dto.maxParticipants !== undefined && { maxParticipants: dto.maxParticipants }),
        ...(dto.resources !== undefined && { resources: dto.resources }),
        ...(dto.schedule !== undefined && { schedule: dto.schedule }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.wellnessPrograms.id, id), eq(schema.wellnessPrograms.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteWellnessProgram(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.wellnessPrograms)
      .where(and(eq(schema.wellnessPrograms.id, id), eq(schema.wellnessPrograms.orgId, orgId), eq(schema.wellnessPrograms.isActive, true)));

    if (!existing.length) throw new NotFoundException('Wellness program not found');

    const [row] = await this.db
      .update(schema.wellnessPrograms)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.wellnessPrograms.id, id), eq(schema.wellnessPrograms.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async listParticipants(orgId: string, programId: string) {
    const participants = await this.db
      .select({
        participation: schema.wellnessParticipations,
        employeeName: sql<string>`concat(${schema.users.firstName}, ' ', coalesce(${schema.users.lastName}, ''))`,
      })
      .from(schema.wellnessParticipations)
      .leftJoin(schema.users, eq(schema.wellnessParticipations.employeeId, schema.users.id))
      .where(and(
        eq(schema.wellnessParticipations.orgId, orgId),
        eq(schema.wellnessParticipations.programId, programId),
        eq(schema.wellnessParticipations.isActive, true),
      ))
      .orderBy(desc(schema.wellnessParticipations.enrolledAt));

    return {
      data: participants.map((p) => ({
        ...p.participation,
        employeeName: p.employeeName,
      })),
      meta: { total: participants.length },
    };
  }

  async getWellnessCalendar(orgId: string) {
    const programs = await this.db
      .select()
      .from(schema.wellnessPrograms)
      .where(and(
        eq(schema.wellnessPrograms.orgId, orgId),
        eq(schema.wellnessPrograms.isActive, true),
        eq(schema.wellnessPrograms.status, 'active'),
      ))
      .orderBy(schema.wellnessPrograms.startDate);

    return {
      data: programs.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        startDate: p.startDate,
        endDate: p.endDate,
        currentParticipants: p.currentParticipants,
        maxParticipants: p.maxParticipants,
        schedule: p.schedule,
      })),
      meta: { total: programs.length },
    };
  }

  async getBudgetSummary(orgId: string) {
    const budgetData = await this.db
      .select({
        totalBudget: sql<number>`coalesce(sum(cast(${schema.wellnessPrograms.budget} as numeric)), 0)`,
        totalSpent: sql<number>`coalesce(sum(cast(${schema.wellnessPrograms.spentBudget} as numeric)), 0)`,
        programCount: sql<number>`count(*)`,
      })
      .from(schema.wellnessPrograms)
      .where(and(eq(schema.wellnessPrograms.orgId, orgId), eq(schema.wellnessPrograms.isActive, true)));

    const totalBudget = Number(budgetData[0]?.totalBudget ?? 0);
    const totalSpent = Number(budgetData[0]?.totalSpent ?? 0);

    return {
      data: {
        totalBudget: Math.round(totalBudget),
        totalSpent: Math.round(totalSpent),
        remaining: Math.round(totalBudget - totalSpent),
        utilizationPercent: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
        programCount: Number(budgetData[0]?.programCount ?? 0),
      },
    };
  }
}
