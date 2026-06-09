import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MandatoryTrainingTrackerService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  /** Join completion rows with the training catalog so the UI gets title/category/description. */
  private completionSelect() {
    return this.db
      .select({
        id: schema.trainingCompletions.id,
        trainingId: schema.trainingCompletions.trainingId,
        employeeId: schema.trainingCompletions.employeeId,
        status: schema.trainingCompletions.status,
        score: schema.trainingCompletions.score,
        dueDate: schema.trainingCompletions.dueDate,
        assignedAt: schema.trainingCompletions.assignedAt,
        completedAt: schema.trainingCompletions.completedAt,
        renewalDue: schema.trainingCompletions.renewalDue,
        certificateUrl: schema.trainingCompletions.certificateUrl,
        title: schema.complianceTrainings.title,
        category: schema.complianceTrainings.category,
        description: schema.complianceTrainings.description,
        estimatedDuration: schema.complianceTrainings.durationMinutes,
      })
      .from(schema.trainingCompletions)
      .innerJoin(schema.complianceTrainings, eq(schema.trainingCompletions.trainingId, schema.complianceTrainings.id));
  }

  private mapTraining(r: {
    id: string;
    trainingId: string;
    status: string;
    score: number | null;
    dueDate: Date | null;
    completedAt: Date | null;
    title: string | null;
    category: string | null;
    description: string | null;
    estimatedDuration: number | null;
  }) {
    return {
      id: r.id,
      trainingId: r.trainingId,
      title: r.title ?? 'Compliance Training',
      category: r.category ?? 'compliance',
      description: r.description ?? undefined,
      status: r.status,
      score: r.score,
      dueDate: r.dueDate,
      completedDate: r.completedAt,
      estimatedDuration: r.estimatedDuration ?? undefined,
    };
  }

  async getMyTrainings(orgId: string, userId: string) {
    const rows = await this.completionSelect()
      .where(
        and(
          eq(schema.trainingCompletions.orgId, orgId),
          eq(schema.trainingCompletions.employeeId, userId),
          eq(schema.trainingCompletions.isActive, true),
        ),
      )
      .orderBy(schema.trainingCompletions.assignedAt);

    return { data: rows.map((r) => this.mapTraining(r)), meta: { total: rows.length } };
  }

  async getOverdueTrainings(orgId: string, userId: string) {
    const rows = await this.completionSelect()
      .where(
        and(
          eq(schema.trainingCompletions.orgId, orgId),
          eq(schema.trainingCompletions.employeeId, userId),
          eq(schema.trainingCompletions.status, 'overdue'),
          eq(schema.trainingCompletions.isActive, true),
        ),
      )
      .orderBy(schema.trainingCompletions.dueDate);

    return { data: rows.map((r) => this.mapTraining(r)), meta: { total: rows.length } };
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
    const rows = await this.completionSelect()
      .where(
        and(
          eq(schema.trainingCompletions.orgId, orgId),
          eq(schema.trainingCompletions.employeeId, userId),
          eq(schema.trainingCompletions.status, 'completed'),
          eq(schema.trainingCompletions.isActive, true),
        ),
      )
      .orderBy(schema.trainingCompletions.completedAt);

    const certs = rows.map((r) => ({
      id: r.id,
      trainingId: r.trainingId,
      trainingTitle: r.title ?? 'Compliance Training',
      issuedDate: r.completedAt,
      expiryDate: r.renewalDue,
      score: r.score ?? 0,
      downloadUrl: r.certificateUrl ?? undefined,
    }));

    return { data: certs, meta: { total: certs.length } };
  }
}
