import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MandatoryTrainingTrackerService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getMyTrainings(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.trainingCompletions)
      .where(
        and(
          eq(schema.trainingCompletions.orgId, orgId),
          eq(schema.trainingCompletions.employeeId, userId),
          eq(schema.trainingCompletions.isActive, true),
        ),
      )
      .orderBy(schema.trainingCompletions.assignedAt);

    return { data: rows, meta: { total: rows.length } };
  }

  async getOverdueTrainings(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.trainingCompletions)
      .where(
        and(
          eq(schema.trainingCompletions.orgId, orgId),
          eq(schema.trainingCompletions.employeeId, userId),
          eq(schema.trainingCompletions.status, 'overdue'),
          eq(schema.trainingCompletions.isActive, true),
        ),
      )
      .orderBy(schema.trainingCompletions.dueDate);

    return { data: rows, meta: { total: rows.length } };
  }

  async markTrainingStarted(orgId: string, userId: string, completionId: string) {
    const existing = await this.db
      .select()
      .from(schema.trainingCompletions)
      .where(
        and(
          eq(schema.trainingCompletions.id, completionId),
          eq(schema.trainingCompletions.orgId, orgId),
          eq(schema.trainingCompletions.employeeId, userId),
          eq(schema.trainingCompletions.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Training completion record not found');

    const [row] = await this.db
      .update(schema.trainingCompletions)
      .set({
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(and(eq(schema.trainingCompletions.id, completionId), eq(schema.trainingCompletions.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async markTrainingCompleted(orgId: string, userId: string, completionId: string, dto: { score?: number }) {
    const existing = await this.db
      .select()
      .from(schema.trainingCompletions)
      .where(
        and(
          eq(schema.trainingCompletions.id, completionId),
          eq(schema.trainingCompletions.orgId, orgId),
          eq(schema.trainingCompletions.employeeId, userId),
          eq(schema.trainingCompletions.isActive, true),
        ),
      );

    if (!existing.length) throw new NotFoundException('Training completion record not found');

    const training = existing[0];
    const score = dto.score ?? null;
    const passingScore = 80; // default passing score
    const passed = score !== null ? score >= passingScore : true;

    const renewalDue = new Date();
    renewalDue.setFullYear(renewalDue.getFullYear() + 1); // default 1 year renewal

    const [row] = await this.db
      .update(schema.trainingCompletions)
      .set({
        status: 'completed',
        completedAt: new Date(),
        score,
        passed,
        renewalDue,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.trainingCompletions.id, completionId), eq(schema.trainingCompletions.orgId, orgId)))
      .returning();

    return { data: row };
  }

  async getMyCertificates(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.trainingCompletions)
      .where(
        and(
          eq(schema.trainingCompletions.orgId, orgId),
          eq(schema.trainingCompletions.employeeId, userId),
          eq(schema.trainingCompletions.status, 'completed'),
          eq(schema.trainingCompletions.isActive, true),
        ),
      )
      .orderBy(schema.trainingCompletions.completedAt);

    return { data: rows, meta: { total: rows.length } };
  }
}
