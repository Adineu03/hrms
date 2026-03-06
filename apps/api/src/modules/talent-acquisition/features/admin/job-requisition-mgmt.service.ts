import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class JobRequisitionMgmtService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listRequisitions(
    orgId: string,
    filters: { status?: string; departmentId?: string; page?: number; limit?: number },
  ) {
    const conditions: any[] = [
      eq(schema.jobRequisitions.orgId, orgId),
      eq(schema.jobRequisitions.isActive, true),
    ];

    if (filters.status) {
      conditions.push(eq(schema.jobRequisitions.status, filters.status));
    }
    if (filters.departmentId) {
      conditions.push(eq(schema.jobRequisitions.departmentId, filters.departmentId));
    }

    const rows = await this.db
      .select({
        requisition: schema.jobRequisitions,
        department: schema.departments,
        designation: schema.designations,
        location: schema.locations,
        creator: schema.users,
      })
      .from(schema.jobRequisitions)
      .leftJoin(schema.departments, eq(schema.jobRequisitions.departmentId, schema.departments.id))
      .leftJoin(schema.designations, eq(schema.jobRequisitions.designationId, schema.designations.id))
      .leftJoin(schema.locations, eq(schema.jobRequisitions.locationId, schema.locations.id))
      .leftJoin(schema.users, eq(schema.jobRequisitions.createdBy, schema.users.id))
      .where(and(...conditions))
      .orderBy(desc(schema.jobRequisitions.createdAt));

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const paginated = rows.slice(offset, offset + limit);

    return {
      data: paginated.map((r) => this.toRequisitionDto(r)),
      meta: {
        total: rows.length,
        page,
        limit,
        totalPages: Math.ceil(rows.length / limit),
      },
    };
  }

  async createRequisition(orgId: string, createdBy: string, data: Record<string, any>) {
    const [created] = await this.db
      .insert(schema.jobRequisitions)
      .values({
        orgId,
        title: data.title,
        departmentId: data.departmentId ?? null,
        designationId: data.designationId ?? null,
        locationId: data.locationId ?? null,
        gradeId: data.gradeId ?? null,
        headcount: data.headcount ?? 1,
        employmentType: data.employmentType ?? 'full_time',
        salaryRangeMin: data.salaryRange?.min ?? data.salaryRangeMin ?? null,
        salaryRangeMax: data.salaryRange?.max ?? data.salaryRangeMax ?? null,
        currency: data.currency ?? 'INR',
        budgetAmount: data.budgetAmount ?? null,
        description: data.description ?? null,
        requirements: data.requirements ?? null,
        skills: data.skills ?? [],
        experience: data.experience ?? {},
        priority: data.priority ?? 'medium',
        targetHireDate: data.targetHireDate ?? null,
        approvalChain: data.approvalChain ?? [],
        status: 'draft',
        createdBy,
        metadata: data.metadata ?? {},
      })
      .returning();

    return this.getRequisition(orgId, created.id);
  }

  async getRequisition(orgId: string, id: string) {
    const [row] = await this.db
      .select({
        requisition: schema.jobRequisitions,
        department: schema.departments,
        designation: schema.designations,
        location: schema.locations,
        creator: schema.users,
      })
      .from(schema.jobRequisitions)
      .leftJoin(schema.departments, eq(schema.jobRequisitions.departmentId, schema.departments.id))
      .leftJoin(schema.designations, eq(schema.jobRequisitions.designationId, schema.designations.id))
      .leftJoin(schema.locations, eq(schema.jobRequisitions.locationId, schema.locations.id))
      .leftJoin(schema.users, eq(schema.jobRequisitions.createdBy, schema.users.id))
      .where(
        and(
          eq(schema.jobRequisitions.id, id),
          eq(schema.jobRequisitions.orgId, orgId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Requisition not found');

    return this.toRequisitionDto(row);
  }

  async updateRequisition(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select({ id: schema.jobRequisitions.id })
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.id, id),
          eq(schema.jobRequisitions.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Requisition not found');

    const now = new Date();
    const updates: Record<string, any> = { updatedAt: now };
    const allowedFields = [
      'title', 'departmentId', 'designationId', 'locationId', 'gradeId',
      'headcount', 'employmentType', 'salaryRangeMin', 'salaryRangeMax',
      'currency', 'budgetAmount', 'description', 'requirements', 'skills',
      'experience', 'priority', 'targetHireDate', 'approvalChain', 'metadata',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    await this.db
      .update(schema.jobRequisitions)
      .set(updates)
      .where(
        and(
          eq(schema.jobRequisitions.id, id),
          eq(schema.jobRequisitions.orgId, orgId),
        ),
      );

    return this.getRequisition(orgId, id);
  }

  async softDelete(orgId: string, id: string) {
    const [existing] = await this.db
      .select({ id: schema.jobRequisitions.id })
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.id, id),
          eq(schema.jobRequisitions.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Requisition not found');

    await this.db
      .update(schema.jobRequisitions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.jobRequisitions.id, id),
          eq(schema.jobRequisitions.orgId, orgId),
        ),
      );

    return { success: true, message: 'Requisition deleted' };
  }

  async submitForApproval(orgId: string, id: string) {
    const [existing] = await this.db
      .select()
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.id, id),
          eq(schema.jobRequisitions.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Requisition not found');

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft requisitions can be submitted for approval');
    }

    await this.db
      .update(schema.jobRequisitions)
      .set({ status: 'pending_approval', currentApproverLevel: 1, updatedAt: new Date() })
      .where(
        and(
          eq(schema.jobRequisitions.id, id),
          eq(schema.jobRequisitions.orgId, orgId),
        ),
      );

    return this.getRequisition(orgId, id);
  }

  async approveRequisition(orgId: string, id: string, approvedBy: string) {
    const [existing] = await this.db
      .select()
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.id, id),
          eq(schema.jobRequisitions.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Requisition not found');

    if (existing.status !== 'pending_approval') {
      throw new BadRequestException('Only pending requisitions can be approved');
    }

    const approvalChain = (existing.approvalChain as any[]) ?? [];
    const currentLevel = existing.currentApproverLevel ?? 1;

    // If there are more levels in the chain, advance to next level
    if (currentLevel < approvalChain.length) {
      await this.db
        .update(schema.jobRequisitions)
        .set({
          currentApproverLevel: currentLevel + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.jobRequisitions.id, id),
            eq(schema.jobRequisitions.orgId, orgId),
          ),
        );
    } else {
      // Final approval
      await this.db
        .update(schema.jobRequisitions)
        .set({
          status: 'approved',
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.jobRequisitions.id, id),
            eq(schema.jobRequisitions.orgId, orgId),
          ),
        );
    }

    return this.getRequisition(orgId, id);
  }

  async rejectRequisition(orgId: string, id: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.id, id),
          eq(schema.jobRequisitions.orgId, orgId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Requisition not found');

    if (existing.status !== 'pending_approval') {
      throw new BadRequestException('Only pending requisitions can be rejected');
    }

    await this.db
      .update(schema.jobRequisitions)
      .set({
        status: 'rejected',
        metadata: { ...(existing.metadata as Record<string, any>), rejectionReason: data.reason ?? '' },
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.jobRequisitions.id, id),
          eq(schema.jobRequisitions.orgId, orgId),
        ),
      );

    return this.getRequisition(orgId, id);
  }

  async getTemplates(orgId: string) {
    const rows = await this.db
      .select({
        title: schema.jobRequisitions.title,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.orgId, orgId),
          eq(schema.jobRequisitions.isActive, true),
        ),
      )
      .groupBy(schema.jobRequisitions.title)
      .orderBy(desc(sql`count(*)`));

    return { data: rows };
  }

  private toRequisitionDto(row: {
    requisition: typeof schema.jobRequisitions.$inferSelect;
    department: typeof schema.departments.$inferSelect | null;
    designation: typeof schema.designations.$inferSelect | null;
    location: typeof schema.locations.$inferSelect | null;
    creator: typeof schema.users.$inferSelect | null;
  }) {
    const r = row.requisition;
    return {
      id: r.id,
      orgId: r.orgId,
      title: r.title,
      departmentId: r.departmentId,
      departmentName: row.department?.name ?? null,
      designationId: r.designationId,
      designationName: row.designation?.name ?? null,
      locationId: r.locationId,
      locationName: row.location?.name ?? null,
      gradeId: r.gradeId,
      headcount: r.headcount,
      employmentType: r.employmentType,
      salaryRangeMin: r.salaryRangeMin,
      salaryRangeMax: r.salaryRangeMax,
      currency: r.currency,
      budgetAmount: r.budgetAmount,
      description: r.description,
      requirements: r.requirements,
      skills: r.skills,
      experience: r.experience,
      approvalChain: r.approvalChain,
      currentApproverLevel: r.currentApproverLevel,
      approvedBy: r.approvedBy,
      approvedAt: r.approvedAt?.toISOString() ?? null,
      status: r.status,
      priority: r.priority,
      targetHireDate: r.targetHireDate,
      filledCount: r.filledCount,
      createdBy: r.createdBy,
      creatorName: row.creator
        ? `${row.creator.firstName} ${row.creator.lastName ?? ''}`.trim()
        : null,
      metadata: r.metadata,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
