import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, asc, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PipelineConfigService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listDefaultStages(orgId: string) {
    const rows = await this.db
      .select()
      .from(schema.recruitmentPipelineStages)
      .where(
        and(
          eq(schema.recruitmentPipelineStages.orgId, orgId),
          isNull(schema.recruitmentPipelineStages.requisitionId),
          eq(schema.recruitmentPipelineStages.isActive, true),
        ),
      )
      .orderBy(asc(schema.recruitmentPipelineStages.sortOrder));

    return { data: rows.map((r) => this.toStageDto(r)) };
  }

  async createStage(orgId: string, data: Record<string, any>) {
    // Determine next sort order if not provided
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const existing = await this.db
        .select({ sortOrder: schema.recruitmentPipelineStages.sortOrder })
        .from(schema.recruitmentPipelineStages)
        .where(
          and(
            eq(schema.recruitmentPipelineStages.orgId, orgId),
            data.requisitionId
              ? eq(schema.recruitmentPipelineStages.requisitionId, data.requisitionId)
              : isNull(schema.recruitmentPipelineStages.requisitionId),
            eq(schema.recruitmentPipelineStages.isActive, true),
          ),
        )
        .orderBy(desc(schema.recruitmentPipelineStages.sortOrder))
        .limit(1);

      sortOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;
    }

    const [created] = await this.db
      .insert(schema.recruitmentPipelineStages)
      .values({
        orgId,
        requisitionId: data.requisitionId ?? null,
        name: data.name,
        code: data.code ?? null,
        stageType: data.stageType ?? 'interview',
        sortOrder,
        evaluationCriteria: data.evaluationCriteria ?? [],
        scorecardTemplate: data.scorecardTemplate ?? {},
        autoAdvanceEnabled: data.autoAdvanceEnabled ?? false,
        autoAdvanceThreshold: data.autoAdvanceThreshold ?? null,
        autoRejectEnabled: data.autoRejectEnabled ?? false,
        autoRejectThreshold: data.autoRejectThreshold ?? null,
        rejectionTemplate: data.rejectionTemplate ?? null,
        slaDays: data.slaDays ?? 7,
        interviewerCount: data.interviewerCount ?? 1,
        isMandatory: data.isMandatory ?? true,
        metadata: data.metadata ?? {},
      })
      .returning();

    return this.toStageDto(created);
  }

  async updateStage(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select({ id: schema.recruitmentPipelineStages.id })
      .from(schema.recruitmentPipelineStages)
      .where(
        and(
          eq(schema.recruitmentPipelineStages.id, id),
          eq(schema.recruitmentPipelineStages.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Pipeline stage not found');

    const now = new Date();
    const updates: Record<string, any> = { updatedAt: now };
    const allowedFields = [
      'name', 'code', 'stageType', 'sortOrder', 'evaluationCriteria',
      'scorecardTemplate', 'autoAdvanceEnabled', 'autoAdvanceThreshold',
      'autoRejectEnabled', 'autoRejectThreshold', 'rejectionTemplate',
      'slaDays', 'interviewerCount', 'isMandatory', 'metadata',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    const [updated] = await this.db
      .update(schema.recruitmentPipelineStages)
      .set(updates)
      .where(
        and(
          eq(schema.recruitmentPipelineStages.id, id),
          eq(schema.recruitmentPipelineStages.orgId, orgId),
        ),
      )
      .returning();

    return this.toStageDto(updated);
  }

  async softDeleteStage(orgId: string, id: string) {
    const [existing] = await this.db
      .select({ id: schema.recruitmentPipelineStages.id })
      .from(schema.recruitmentPipelineStages)
      .where(
        and(
          eq(schema.recruitmentPipelineStages.id, id),
          eq(schema.recruitmentPipelineStages.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Pipeline stage not found');

    await this.db
      .update(schema.recruitmentPipelineStages)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.recruitmentPipelineStages.id, id),
          eq(schema.recruitmentPipelineStages.orgId, orgId),
        ),
      );

    return { success: true, message: 'Pipeline stage deleted' };
  }

  async reorderStages(orgId: string, stages: { id: string; sortOrder: number }[]) {
    if (!stages || !Array.isArray(stages) || stages.length === 0) {
      throw new BadRequestException('Stages array is required');
    }

    await this.db.transaction(async (tx) => {
      for (const stage of stages) {
        await tx
          .update(schema.recruitmentPipelineStages)
          .set({ sortOrder: stage.sortOrder, updatedAt: new Date() })
          .where(
            and(
              eq(schema.recruitmentPipelineStages.id, stage.id),
              eq(schema.recruitmentPipelineStages.orgId, orgId),
            ),
          );
      }
    });

    return { success: true, message: `Reordered ${stages.length} stages` };
  }

  async getRequisitionStages(orgId: string, requisitionId: string) {
    const rows = await this.db
      .select()
      .from(schema.recruitmentPipelineStages)
      .where(
        and(
          eq(schema.recruitmentPipelineStages.orgId, orgId),
          eq(schema.recruitmentPipelineStages.requisitionId, requisitionId),
          eq(schema.recruitmentPipelineStages.isActive, true),
        ),
      )
      .orderBy(asc(schema.recruitmentPipelineStages.sortOrder));

    return { data: rows.map((r) => this.toStageDto(r)) };
  }

  async copyDefaultsToRequisition(orgId: string, requisitionId: string) {
    // Verify the requisition exists
    const [req] = await this.db
      .select({ id: schema.jobRequisitions.id })
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.id, requisitionId),
          eq(schema.jobRequisitions.orgId, orgId),
        ),
      )
      .limit(1);

    if (!req) throw new NotFoundException('Requisition not found');

    // Get org-wide default stages
    const defaults = await this.db
      .select()
      .from(schema.recruitmentPipelineStages)
      .where(
        and(
          eq(schema.recruitmentPipelineStages.orgId, orgId),
          isNull(schema.recruitmentPipelineStages.requisitionId),
          eq(schema.recruitmentPipelineStages.isActive, true),
        ),
      )
      .orderBy(asc(schema.recruitmentPipelineStages.sortOrder));

    if (defaults.length === 0) {
      throw new BadRequestException('No default pipeline stages found');
    }

    // Copy each default stage to the requisition
    const created: any[] = [];
    for (const stage of defaults) {
      const [newStage] = await this.db
        .insert(schema.recruitmentPipelineStages)
        .values({
          orgId,
          requisitionId,
          name: stage.name,
          code: stage.code,
          stageType: stage.stageType,
          sortOrder: stage.sortOrder,
          evaluationCriteria: stage.evaluationCriteria,
          scorecardTemplate: stage.scorecardTemplate,
          autoAdvanceEnabled: stage.autoAdvanceEnabled,
          autoAdvanceThreshold: stage.autoAdvanceThreshold,
          autoRejectEnabled: stage.autoRejectEnabled,
          autoRejectThreshold: stage.autoRejectThreshold,
          rejectionTemplate: stage.rejectionTemplate,
          slaDays: stage.slaDays,
          interviewerCount: stage.interviewerCount,
          isMandatory: stage.isMandatory,
          metadata: stage.metadata,
        })
        .returning();

      created.push(this.toStageDto(newStage));
    }

    return { data: created, message: `Copied ${created.length} default stages to requisition` };
  }

  private toStageDto(row: typeof schema.recruitmentPipelineStages.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      requisitionId: row.requisitionId,
      name: row.name,
      code: row.code,
      stageType: row.stageType,
      sortOrder: row.sortOrder,
      evaluationCriteria: row.evaluationCriteria,
      scorecardTemplate: row.scorecardTemplate,
      autoAdvanceEnabled: row.autoAdvanceEnabled,
      autoAdvanceThreshold: row.autoAdvanceThreshold,
      autoRejectEnabled: row.autoRejectEnabled,
      autoRejectThreshold: row.autoRejectThreshold,
      rejectionTemplate: row.rejectionTemplate,
      slaDays: row.slaDays,
      interviewerCount: row.interviewerCount,
      isMandatory: row.isMandatory,
      metadata: row.metadata,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
