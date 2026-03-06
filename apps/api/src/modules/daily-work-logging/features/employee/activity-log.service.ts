import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, asc, sql, gte, lte, or, ilike } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ActivityLogService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── List Activities with Filters ────────────────────────────────────────
  async listActivities(
    orgId: string,
    employeeId: string,
    filters: {
      from?: string;
      to?: string;
      projectId?: string;
      tags?: string;
      search?: string;
      page?: string;
      limit?: string;
    },
  ) {
    const page = Math.max(1, parseInt(filters.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit || '50', 10)));
    const offset = (page - 1) * limit;

    const conditions = [
      eq(schema.timesheetEntries.orgId, orgId),
      eq(schema.timesheetEntries.employeeId, employeeId),
    ];

    if (filters.from) {
      conditions.push(gte(schema.timesheetEntries.date, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(schema.timesheetEntries.date, filters.to));
    }
    if (filters.projectId) {
      conditions.push(eq(schema.timesheetEntries.projectId, filters.projectId));
    }
    if (filters.search) {
      conditions.push(ilike(schema.timesheetEntries.description, `%${filters.search}%`));
    }

    // Build the base query with conditions
    let whereClause = and(...conditions)!;

    // For tags filter, we use a raw SQL condition on the JSONB array
    if (filters.tags) {
      const tagList = filters.tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        // Check if ANY of the provided tags exist in the JSONB tags array
        const tagConditions = tagList.map(
          (tag) => sql`${schema.timesheetEntries.tags}::jsonb @> ${JSON.stringify([tag])}::jsonb`,
        );
        const tagWhere = tagConditions.length === 1
          ? tagConditions[0]
          : sql`(${sql.join(tagConditions, sql` OR `)})`;
        whereClause = and(whereClause, tagWhere)!;
      }
    }

    const entries = await this.db
      .select({
        entry: schema.timesheetEntries,
        projectName: schema.projects.name,
        projectCode: schema.projects.code,
        projectColor: schema.projects.color,
        categoryName: schema.taskCategories.name,
        categoryColor: schema.taskCategories.color,
      })
      .from(schema.timesheetEntries)
      .leftJoin(schema.projects, eq(schema.timesheetEntries.projectId, schema.projects.id))
      .leftJoin(schema.taskCategories, eq(schema.timesheetEntries.taskCategoryId, schema.taskCategories.id))
      .where(whereClause)
      .orderBy(desc(schema.timesheetEntries.date), desc(schema.timesheetEntries.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await this.db
      .select({ total: sql<string>`count(*)` })
      .from(schema.timesheetEntries)
      .where(whereClause);

    const total = parseInt(countResult?.total || '0', 10);

    return {
      activities: entries.map((e) => this.toActivityDto(e)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Create Activity Log Entry ───────────────────────────────────────────
  async createActivity(orgId: string, employeeId: string, data: Record<string, any>) {
    const {
      date,
      projectId,
      taskCategoryId,
      startTime,
      endTime,
      hours,
      description,
      isBillable,
      tags,
      activityType,
    } = data;

    if (!date) {
      throw new BadRequestException('date is required');
    }

    if (!description) {
      throw new BadRequestException('description is required for activity log entries');
    }

    let calculatedHours = hours;
    if (!calculatedHours && startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
      calculatedHours = diffMinutes > 0 ? Math.round((diffMinutes / 60) * 100) / 100 : 0;
    }

    if (!calculatedHours || Number(calculatedHours) <= 0) {
      throw new BadRequestException('Either hours or valid startTime/endTime are required');
    }

    // Validate project if provided
    if (projectId) {
      const [project] = await this.db
        .select()
        .from(schema.projects)
        .where(and(eq(schema.projects.id, projectId), eq(schema.projects.orgId, orgId)))
        .limit(1);

      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    // Validate task category if provided
    if (taskCategoryId) {
      const [category] = await this.db
        .select()
        .from(schema.taskCategories)
        .where(and(eq(schema.taskCategories.id, taskCategoryId), eq(schema.taskCategories.orgId, orgId)))
        .limit(1);

      if (!category) {
        throw new NotFoundException('Task category not found');
      }
    }

    const [entry] = await this.db
      .insert(schema.timesheetEntries)
      .values({
        orgId,
        employeeId,
        date,
        projectId: projectId || null,
        taskCategoryId: taskCategoryId || null,
        startTime: startTime || null,
        endTime: endTime || null,
        hours: String(calculatedHours),
        description,
        isBillable: isBillable || false,
        tags: tags || [],
        activityType: activityType || 'activity',
        status: 'draft',
      })
      .returning();

    return this.toBasicActivityDto(entry);
  }

  // ── Update Activity ─────────────────────────────────────────────────────
  async updateActivity(orgId: string, employeeId: string, activityId: string, data: Record<string, any>) {
    const [existing] = await this.db
      .select()
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.id, activityId),
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Activity not found');
    }

    if (existing.status === 'approved' || existing.status === 'locked') {
      throw new BadRequestException('Cannot update an approved or locked activity');
    }

    const updateFields: Record<string, any> = { updatedAt: new Date() };

    if (data.projectId !== undefined) updateFields.projectId = data.projectId || null;
    if (data.taskCategoryId !== undefined) updateFields.taskCategoryId = data.taskCategoryId || null;
    if (data.startTime !== undefined) updateFields.startTime = data.startTime || null;
    if (data.endTime !== undefined) updateFields.endTime = data.endTime || null;
    if (data.description !== undefined) updateFields.description = data.description;
    if (data.isBillable !== undefined) updateFields.isBillable = data.isBillable;
    if (data.tags !== undefined) updateFields.tags = data.tags;
    if (data.activityType !== undefined) updateFields.activityType = data.activityType || null;

    if (data.hours !== undefined) {
      updateFields.hours = String(data.hours);
    } else if (data.startTime && data.endTime) {
      const [sh, sm] = data.startTime.split(':').map(Number);
      const [eh, em] = data.endTime.split(':').map(Number);
      const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMinutes > 0) {
        updateFields.hours = String(Math.round((diffMinutes / 60) * 100) / 100);
      }
    }

    const [updated] = await this.db
      .update(schema.timesheetEntries)
      .set(updateFields)
      .where(eq(schema.timesheetEntries.id, activityId))
      .returning();

    return this.toBasicActivityDto(updated);
  }

  // ── Get Tags ────────────────────────────────────────────────────────────
  async getTags(orgId: string, employeeId: string) {
    // Extract all unique tags from the employee's entries
    const result = await this.db
      .select({
        tags: schema.timesheetEntries.tags,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          sql`${schema.timesheetEntries.tags}::jsonb != '[]'::jsonb`,
        ),
      );

    const tagSet = new Set<string>();
    for (const row of result) {
      const tags = row.tags as string[] | null;
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (typeof tag === 'string' && tag.trim()) {
            tagSet.add(tag.trim());
          }
        }
      }
    }

    const sortedTags = Array.from(tagSet).sort();

    return {
      tags: sortedTags,
      totalCount: sortedTags.length,
    };
  }

  // ── Export Activity Log ─────────────────────────────────────────────────
  async exportActivities(
    orgId: string,
    employeeId: string,
    filters: { from?: string; to?: string; projectId?: string },
  ) {
    const conditions = [
      eq(schema.timesheetEntries.orgId, orgId),
      eq(schema.timesheetEntries.employeeId, employeeId),
    ];

    if (filters.from) {
      conditions.push(gte(schema.timesheetEntries.date, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(schema.timesheetEntries.date, filters.to));
    }
    if (filters.projectId) {
      conditions.push(eq(schema.timesheetEntries.projectId, filters.projectId));
    }

    const entries = await this.db
      .select({
        entry: schema.timesheetEntries,
        projectName: schema.projects.name,
        projectCode: schema.projects.code,
        categoryName: schema.taskCategories.name,
      })
      .from(schema.timesheetEntries)
      .leftJoin(schema.projects, eq(schema.timesheetEntries.projectId, schema.projects.id))
      .leftJoin(schema.taskCategories, eq(schema.timesheetEntries.taskCategoryId, schema.taskCategories.id))
      .where(and(...conditions))
      .orderBy(asc(schema.timesheetEntries.date), asc(schema.timesheetEntries.startTime));

    const totalHours = entries.reduce((sum, e) => sum + Number(e.entry.hours || 0), 0);
    const billableHours = entries.filter((e) => e.entry.isBillable).reduce((sum, e) => sum + Number(e.entry.hours || 0), 0);

    return {
      exportDate: new Date().toISOString(),
      filters: {
        from: filters.from || null,
        to: filters.to || null,
        projectId: filters.projectId || null,
      },
      summary: {
        totalEntries: entries.length,
        totalHours,
        billableHours,
        nonBillableHours: totalHours - billableHours,
      },
      entries: entries.map((e) => ({
        date: e.entry.date,
        projectName: e.projectName || 'No Project',
        projectCode: e.projectCode || '',
        categoryName: e.categoryName || '',
        startTime: e.entry.startTime,
        endTime: e.entry.endTime,
        hours: Number(e.entry.hours),
        description: e.entry.description,
        isBillable: e.entry.isBillable,
        tags: e.entry.tags,
        activityType: e.entry.activityType,
        status: e.entry.status,
      })),
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private toActivityDto(row: {
    entry: typeof schema.timesheetEntries.$inferSelect;
    projectName: string | null;
    projectCode: string | null;
    projectColor: string | null;
    categoryName: string | null;
    categoryColor: string | null;
  }) {
    return {
      id: row.entry.id,
      orgId: row.entry.orgId,
      employeeId: row.entry.employeeId,
      date: row.entry.date,
      projectId: row.entry.projectId,
      projectName: row.projectName,
      projectCode: row.projectCode,
      projectColor: row.projectColor,
      taskCategoryId: row.entry.taskCategoryId,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
      startTime: row.entry.startTime,
      endTime: row.entry.endTime,
      hours: Number(row.entry.hours),
      description: row.entry.description,
      isBillable: row.entry.isBillable,
      tags: row.entry.tags,
      activityType: row.entry.activityType,
      status: row.entry.status,
      createdAt: row.entry.createdAt.toISOString(),
      updatedAt: row.entry.updatedAt.toISOString(),
    };
  }

  private toBasicActivityDto(row: typeof schema.timesheetEntries.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      date: row.date,
      projectId: row.projectId,
      taskCategoryId: row.taskCategoryId,
      startTime: row.startTime,
      endTime: row.endTime,
      hours: Number(row.hours),
      description: row.description,
      isBillable: row.isBillable,
      tags: row.tags,
      activityType: row.activityType,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
