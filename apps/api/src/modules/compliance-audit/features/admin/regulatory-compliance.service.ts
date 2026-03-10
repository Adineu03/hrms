import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, isNotNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class RegulatoryComplianceService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listChecklists(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.complianceChecklists)
      .where(and(eq(schema.complianceChecklists.orgId, orgId), eq(schema.complianceChecklists.isActive, true)))
      .orderBy(schema.complianceChecklists.createdAt);

    return { data: rows, meta: { total: rows.length } };
  }

  async createChecklist(
    orgId: string,
    dto: {
      title: string;
      jurisdiction: string;
      category: string;
      description?: string;
      dueDate?: string;
      frequency?: string;
      assignedTo?: string;
    },
  ) {
    const [row] = await this.db
      .insert(schema.complianceChecklists)
      .values({
        orgId,
        title: dto.title,
        jurisdiction: dto.jurisdiction,
        category: dto.category,
        description: dto.description ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        frequency: dto.frequency ?? 'annual',
        assignedTo: dto.assignedTo ?? null,
      })
      .returning();

    return { data: row };
  }

  async updateChecklist(
    orgId: string,
    id: string,
    dto: {
      title?: string;
      jurisdiction?: string;
      category?: string;
      description?: string;
      dueDate?: string;
      frequency?: string;
      assignedTo?: string;
    },
  ) {
    const existing = await this.db
      .select()
      .from(schema.complianceChecklists)
      .where(and(eq(schema.complianceChecklists.id, id), eq(schema.complianceChecklists.orgId, orgId), eq(schema.complianceChecklists.isActive, true)));

    if (!existing.length) throw new NotFoundException('Compliance checklist not found');

    const [row] = await this.db
      .update(schema.complianceChecklists)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.jurisdiction !== undefined && { jurisdiction: dto.jurisdiction }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.complianceChecklists.id, id), eq(schema.complianceChecklists.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async completeChecklist(orgId: string, id: string, dto: { evidenceNotes?: string }) {
    const existing = await this.db
      .select()
      .from(schema.complianceChecklists)
      .where(and(eq(schema.complianceChecklists.id, id), eq(schema.complianceChecklists.orgId, orgId), eq(schema.complianceChecklists.isActive, true)));

    if (!existing.length) throw new NotFoundException('Compliance checklist not found');

    const [row] = await this.db
      .update(schema.complianceChecklists)
      .set({
        status: 'completed',
        completedAt: new Date(),
        ...(dto.evidenceNotes !== undefined && { evidenceNotes: dto.evidenceNotes }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.complianceChecklists.id, id), eq(schema.complianceChecklists.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async deleteChecklist(orgId: string, id: string) {
    const existing = await this.db
      .select()
      .from(schema.complianceChecklists)
      .where(and(eq(schema.complianceChecklists.id, id), eq(schema.complianceChecklists.orgId, orgId), eq(schema.complianceChecklists.isActive, true)));

    if (!existing.length) throw new NotFoundException('Compliance checklist not found');

    const [row] = await this.db
      .update(schema.complianceChecklists)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.complianceChecklists.id, id), eq(schema.complianceChecklists.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getFilingCalendar(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.complianceChecklists)
      .where(and(eq(schema.complianceChecklists.orgId, orgId), eq(schema.complianceChecklists.isActive, true), isNotNull(schema.complianceChecklists.dueDate)))
      .orderBy(schema.complianceChecklists.dueDate);

    return { data: rows, meta: { total: rows.length } };
  }
}
