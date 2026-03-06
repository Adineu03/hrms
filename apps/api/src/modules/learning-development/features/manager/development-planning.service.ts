import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class DevelopmentPlanningService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const members = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
    return members.map((m) => m.userId);
  }

  async listDevelopmentPlans(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], meta: { total: 0 } };

    const rows = await this.db
      .select({
        path: schema.learningPaths,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.learningPaths)
      .innerJoin(schema.users, eq(schema.learningPaths.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.learningPaths.orgId, orgId),
          inArray(schema.learningPaths.employeeId, teamIds),
          eq(schema.learningPaths.isActive, true),
        ),
      )
      .orderBy(desc(schema.learningPaths.updatedAt));

    return {
      data: rows.map((r) => ({
        ...r.path,
        employeeName: `${r.firstName} ${r.lastName}`,
      })),
      meta: { total: rows.length },
    };
  }

  async createDevelopmentPlan(orgId: string, managerId: string, data: {
    employeeId: string;
    title: string;
    description?: string;
    type?: string;
    targetRole?: string;
    skills?: any[];
    estimatedHours?: number;
    items?: Array<{ courseId?: string; title: string; itemType?: string; order?: number; isRequired?: boolean }>;
  }) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (!teamIds.includes(data.employeeId)) {
      throw new NotFoundException('Employee is not a direct report');
    }

    const items = data.items ?? [];

    const [path] = await this.db
      .insert(schema.learningPaths)
      .values({
        orgId,
        employeeId: data.employeeId,
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? 'role_based',
        targetRole: data.targetRole ?? null,
        skills: data.skills ?? [],
        totalItems: items.length,
        estimatedHours: data.estimatedHours ?? null,
        status: 'active',
        createdBy: managerId,
        metadata: { createdByManager: true },
      })
      .returning();

    // Create learning path items if provided
    if (items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await this.db.insert(schema.learningPathItems).values({
          orgId,
          learningPathId: path.id,
          courseId: item.courseId ?? null,
          itemType: item.itemType ?? 'course',
          title: item.title,
          order: item.order ?? i + 1,
          isRequired: item.isRequired ?? true,
          status: 'pending',
        });
      }
    }

    return { message: 'Development plan created successfully', plan: path };
  }

  async getDevelopmentPlan(orgId: string, id: string) {
    const [path] = await this.db
      .select({
        path: schema.learningPaths,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.learningPaths)
      .innerJoin(schema.users, eq(schema.learningPaths.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.learningPaths.id, id),
          eq(schema.learningPaths.orgId, orgId),
          eq(schema.learningPaths.isActive, true),
        ),
      )
      .limit(1);

    if (!path) throw new NotFoundException('Development plan not found');

    // Get items
    const items = await this.db
      .select()
      .from(schema.learningPathItems)
      .where(
        and(
          eq(schema.learningPathItems.learningPathId, id),
          eq(schema.learningPathItems.orgId, orgId),
          eq(schema.learningPathItems.isActive, true),
        ),
      )
      .orderBy(schema.learningPathItems.order);

    return {
      ...path.path,
      employeeName: `${path.firstName} ${path.lastName}`,
      items,
    };
  }

  async updateDevelopmentPlan(orgId: string, id: string, data: {
    title?: string;
    description?: string;
    type?: string;
    targetRole?: string;
    skills?: any[];
    estimatedHours?: number;
    status?: string;
  }) {
    const [existing] = await this.db
      .select({ id: schema.learningPaths.id })
      .from(schema.learningPaths)
      .where(
        and(
          eq(schema.learningPaths.id, id),
          eq(schema.learningPaths.orgId, orgId),
          eq(schema.learningPaths.isActive, true),
        ),
      );

    if (!existing) throw new NotFoundException('Development plan not found');

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.type !== undefined) updates.type = data.type;
    if (data.targetRole !== undefined) updates.targetRole = data.targetRole;
    if (data.skills !== undefined) updates.skills = data.skills;
    if (data.estimatedHours !== undefined) updates.estimatedHours = data.estimatedHours;
    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === 'completed') updates.completedAt = new Date();
    }

    const [updated] = await this.db
      .update(schema.learningPaths)
      .set(updates)
      .where(eq(schema.learningPaths.id, id))
      .returning();

    return updated;
  }
}
