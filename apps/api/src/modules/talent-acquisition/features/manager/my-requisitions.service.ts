import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, count, sum, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyRequisitionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getManagerRequisitionIds(orgId: string, managerId: string): Promise<string[]> {
    const reqs = await this.db
      .select({ id: schema.jobRequisitions.id })
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.orgId, orgId),
          eq(schema.jobRequisitions.createdBy, managerId),
          eq(schema.jobRequisitions.isActive, true),
        ),
      );
    return reqs.map((r) => r.id);
  }

  private toDto(requisition: Record<string, any>) {
    return {
      ...requisition,
      salaryRangeMin: requisition.salaryRangeMin ? Number(requisition.salaryRangeMin) : null,
      salaryRangeMax: requisition.salaryRangeMax ? Number(requisition.salaryRangeMax) : null,
      budgetAmount: requisition.budgetAmount ? Number(requisition.budgetAmount) : null,
      createdAt: requisition.createdAt?.toISOString?.() ?? requisition.createdAt,
      updatedAt: requisition.updatedAt?.toISOString?.() ?? requisition.updatedAt,
      approvedAt: requisition.approvedAt?.toISOString?.() ?? requisition.approvedAt ?? null,
      targetHireDate: requisition.targetHireDate ?? null,
    };
  }

  async listRequisitions(orgId: string, managerId: string, status?: string) {
    const conditions = [
      eq(schema.jobRequisitions.orgId, orgId),
      eq(schema.jobRequisitions.createdBy, managerId),
      eq(schema.jobRequisitions.isActive, true),
    ];

    if (status) {
      conditions.push(eq(schema.jobRequisitions.status, status));
    }

    const requisitions = await this.db
      .select({
        id: schema.jobRequisitions.id,
        title: schema.jobRequisitions.title,
        departmentId: schema.jobRequisitions.departmentId,
        designationId: schema.jobRequisitions.designationId,
        locationId: schema.jobRequisitions.locationId,
        gradeId: schema.jobRequisitions.gradeId,
        headcount: schema.jobRequisitions.headcount,
        employmentType: schema.jobRequisitions.employmentType,
        salaryRangeMin: schema.jobRequisitions.salaryRangeMin,
        salaryRangeMax: schema.jobRequisitions.salaryRangeMax,
        currency: schema.jobRequisitions.currency,
        budgetAmount: schema.jobRequisitions.budgetAmount,
        status: schema.jobRequisitions.status,
        priority: schema.jobRequisitions.priority,
        targetHireDate: schema.jobRequisitions.targetHireDate,
        filledCount: schema.jobRequisitions.filledCount,
        skills: schema.jobRequisitions.skills,
        approvalChain: schema.jobRequisitions.approvalChain,
        currentApproverLevel: schema.jobRequisitions.currentApproverLevel,
        approvedAt: schema.jobRequisitions.approvedAt,
        departmentName: schema.departments.name,
        createdAt: schema.jobRequisitions.createdAt,
        updatedAt: schema.jobRequisitions.updatedAt,
      })
      .from(schema.jobRequisitions)
      .leftJoin(schema.departments, eq(schema.jobRequisitions.departmentId, schema.departments.id))
      .where(and(...conditions))
      .orderBy(desc(schema.jobRequisitions.createdAt));

    return {
      data: requisitions.map((r) => this.toDto(r)),
      total: requisitions.length,
    };
  }

  async createRequisition(orgId: string, managerId: string, body: Record<string, any>) {
    const [requisition] = await this.db
      .insert(schema.jobRequisitions)
      .values({
        orgId,
        title: body.title,
        departmentId: body.departmentId ?? null,
        designationId: body.designationId ?? null,
        locationId: body.locationId ?? null,
        gradeId: body.gradeId ?? null,
        headcount: body.headcount ?? 1,
        employmentType: body.employmentType ?? 'full_time',
        salaryRangeMin: body.salaryRangeMin?.toString() ?? null,
        salaryRangeMax: body.salaryRangeMax?.toString() ?? null,
        currency: body.currency ?? 'INR',
        budgetAmount: body.budgetAmount?.toString() ?? null,
        description: body.description ?? null,
        requirements: body.requirements ?? null,
        skills: body.skills ?? [],
        experience: body.experience ?? {},
        approvalChain: body.approvalChain ?? [],
        priority: body.priority ?? 'medium',
        targetHireDate: body.targetHireDate ?? null,
        status: 'draft',
        createdBy: managerId,
        metadata: body.metadata ?? {},
      })
      .returning();

    return this.toDto(requisition);
  }

  async getRequisitionDetail(orgId: string, managerId: string, requisitionId: string) {
    const [requisition] = await this.db
      .select({
        id: schema.jobRequisitions.id,
        title: schema.jobRequisitions.title,
        departmentId: schema.jobRequisitions.departmentId,
        designationId: schema.jobRequisitions.designationId,
        locationId: schema.jobRequisitions.locationId,
        gradeId: schema.jobRequisitions.gradeId,
        headcount: schema.jobRequisitions.headcount,
        employmentType: schema.jobRequisitions.employmentType,
        salaryRangeMin: schema.jobRequisitions.salaryRangeMin,
        salaryRangeMax: schema.jobRequisitions.salaryRangeMax,
        currency: schema.jobRequisitions.currency,
        budgetAmount: schema.jobRequisitions.budgetAmount,
        description: schema.jobRequisitions.description,
        requirements: schema.jobRequisitions.requirements,
        skills: schema.jobRequisitions.skills,
        experience: schema.jobRequisitions.experience,
        approvalChain: schema.jobRequisitions.approvalChain,
        currentApproverLevel: schema.jobRequisitions.currentApproverLevel,
        approvedBy: schema.jobRequisitions.approvedBy,
        approvedAt: schema.jobRequisitions.approvedAt,
        status: schema.jobRequisitions.status,
        priority: schema.jobRequisitions.priority,
        targetHireDate: schema.jobRequisitions.targetHireDate,
        filledCount: schema.jobRequisitions.filledCount,
        createdBy: schema.jobRequisitions.createdBy,
        metadata: schema.jobRequisitions.metadata,
        departmentName: schema.departments.name,
        createdAt: schema.jobRequisitions.createdAt,
        updatedAt: schema.jobRequisitions.updatedAt,
      })
      .from(schema.jobRequisitions)
      .leftJoin(schema.departments, eq(schema.jobRequisitions.departmentId, schema.departments.id))
      .where(
        and(
          eq(schema.jobRequisitions.id, requisitionId),
          eq(schema.jobRequisitions.orgId, orgId),
          eq(schema.jobRequisitions.createdBy, managerId),
        ),
      );

    if (!requisition) {
      throw new NotFoundException('Requisition not found or access denied');
    }

    return this.toDto(requisition);
  }

  async getPipelineProgress(orgId: string, managerId: string, requisitionId: string) {
    // Verify manager owns the requisition
    const [requisition] = await this.db
      .select({ id: schema.jobRequisitions.id, title: schema.jobRequisitions.title })
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.id, requisitionId),
          eq(schema.jobRequisitions.orgId, orgId),
          eq(schema.jobRequisitions.createdBy, managerId),
        ),
      );

    if (!requisition) {
      throw new NotFoundException('Requisition not found or access denied');
    }

    // Get pipeline stages for this requisition
    const stages = await this.db
      .select({
        id: schema.recruitmentPipelineStages.id,
        name: schema.recruitmentPipelineStages.name,
        code: schema.recruitmentPipelineStages.code,
        stageType: schema.recruitmentPipelineStages.stageType,
        sortOrder: schema.recruitmentPipelineStages.sortOrder,
      })
      .from(schema.recruitmentPipelineStages)
      .where(
        and(
          eq(schema.recruitmentPipelineStages.orgId, orgId),
          eq(schema.recruitmentPipelineStages.requisitionId, requisitionId),
          eq(schema.recruitmentPipelineStages.isActive, true),
        ),
      )
      .orderBy(schema.recruitmentPipelineStages.sortOrder);

    // Get applications for this requisition with their current stages
    const applications = await this.db
      .select({
        id: schema.applications.id,
        currentStageId: schema.applications.currentStageId,
        status: schema.applications.status,
      })
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.orgId, orgId),
          eq(schema.applications.requisitionId, requisitionId),
          eq(schema.applications.isActive, true),
        ),
      );

    // Count applications per stage
    const stageCountMap = new Map<string, number>();
    const statusCounts: Record<string, number> = {};

    for (const app of applications) {
      if (app.currentStageId) {
        stageCountMap.set(app.currentStageId, (stageCountMap.get(app.currentStageId) ?? 0) + 1);
      }
      statusCounts[app.status] = (statusCounts[app.status] ?? 0) + 1;
    }

    const pipeline = stages.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      stageCode: stage.code,
      stageType: stage.stageType,
      sortOrder: stage.sortOrder,
      candidateCount: stageCountMap.get(stage.id) ?? 0,
    }));

    return {
      requisitionId,
      requisitionTitle: requisition.title,
      totalApplications: applications.length,
      statusCounts,
      pipeline,
    };
  }

  async getBudgetUtilization(orgId: string, managerId: string) {
    // Get all manager's requisitions with budget data
    const requisitions = await this.db
      .select({
        id: schema.jobRequisitions.id,
        title: schema.jobRequisitions.title,
        headcount: schema.jobRequisitions.headcount,
        salaryRangeMax: schema.jobRequisitions.salaryRangeMax,
        budgetAmount: schema.jobRequisitions.budgetAmount,
        currency: schema.jobRequisitions.currency,
        filledCount: schema.jobRequisitions.filledCount,
        status: schema.jobRequisitions.status,
      })
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.orgId, orgId),
          eq(schema.jobRequisitions.createdBy, managerId),
          eq(schema.jobRequisitions.isActive, true),
        ),
      );

    const reqIds = requisitions.map((r) => r.id);

    // Get accepted offers for these requisitions
    let offerTotals = new Map<string, { count: number; totalSalary: number }>();
    if (reqIds.length > 0) {
      const offers = await this.db
        .select({
          requisitionId: schema.offerLetters.requisitionId,
          salaryAmount: schema.offerLetters.salaryAmount,
          status: schema.offerLetters.status,
        })
        .from(schema.offerLetters)
        .where(
          and(
            eq(schema.offerLetters.orgId, orgId),
            inArray(schema.offerLetters.requisitionId, reqIds),
            eq(schema.offerLetters.status, 'accepted'),
          ),
        );

      for (const offer of offers) {
        const current = offerTotals.get(offer.requisitionId) ?? { count: 0, totalSalary: 0 };
        current.count += 1;
        current.totalSalary += Number(offer.salaryAmount);
        offerTotals.set(offer.requisitionId, current);
      }
    }

    let totalBudget = 0;
    let totalActualSpend = 0;

    const breakdown = requisitions.map((req) => {
      const plannedBudget = req.budgetAmount
        ? Number(req.budgetAmount)
        : (Number(req.salaryRangeMax ?? 0) * req.headcount);
      const offerData = offerTotals.get(req.id) ?? { count: 0, totalSalary: 0 };

      totalBudget += plannedBudget;
      totalActualSpend += offerData.totalSalary;

      return {
        requisitionId: req.id,
        title: req.title,
        headcount: req.headcount,
        filledCount: req.filledCount ?? 0,
        currency: req.currency,
        plannedBudget: Math.round(plannedBudget * 100) / 100,
        actualSpend: Math.round(offerData.totalSalary * 100) / 100,
        acceptedOffers: offerData.count,
        utilization: plannedBudget > 0
          ? Math.round((offerData.totalSalary / plannedBudget) * 10000) / 100
          : 0,
        status: req.status,
      };
    });

    return {
      summary: {
        totalBudget: Math.round(totalBudget * 100) / 100,
        totalActualSpend: Math.round(totalActualSpend * 100) / 100,
        overallUtilization: totalBudget > 0
          ? Math.round((totalActualSpend / totalBudget) * 10000) / 100
          : 0,
        totalRequisitions: requisitions.length,
      },
      breakdown,
    };
  }
}
