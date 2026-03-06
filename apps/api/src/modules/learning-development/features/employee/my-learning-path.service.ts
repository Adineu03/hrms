import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class MyLearningPathService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listMyPaths(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.learningPaths)
      .where(
        and(
          eq(schema.learningPaths.orgId, orgId),
          eq(schema.learningPaths.employeeId, userId),
          eq(schema.learningPaths.isActive, true),
        ),
      )
      .orderBy(desc(schema.learningPaths.updatedAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async getPathDetails(orgId: string, userId: string, pathId: string) {
    const [path] = await this.db
      .select()
      .from(schema.learningPaths)
      .where(
        and(
          eq(schema.learningPaths.id, pathId),
          eq(schema.learningPaths.orgId, orgId),
          eq(schema.learningPaths.employeeId, userId),
          eq(schema.learningPaths.isActive, true),
        ),
      )
      .limit(1);

    if (!path) throw new NotFoundException('Learning path not found');

    // Get items with course details
    const items = await this.db
      .select()
      .from(schema.learningPathItems)
      .where(
        and(
          eq(schema.learningPathItems.learningPathId, pathId),
          eq(schema.learningPathItems.orgId, orgId),
          eq(schema.learningPathItems.isActive, true),
        ),
      )
      .orderBy(schema.learningPathItems.order);

    // Enrich items with course info where applicable
    const enrichedItems = [];
    for (const item of items) {
      let courseInfo = null;
      if (item.courseId) {
        const [course] = await this.db
          .select({
            title: schema.courses.title,
            type: schema.courses.type,
            format: schema.courses.format,
            duration: schema.courses.duration,
            difficulty: schema.courses.difficulty,
          })
          .from(schema.courses)
          .where(eq(schema.courses.id, item.courseId))
          .limit(1);
        courseInfo = course ?? null;
      }
      enrichedItems.push({ ...item, courseInfo });
    }

    return { ...path, items: enrichedItems };
  }

  async markItemComplete(orgId: string, userId: string, pathId: string, itemId: string) {
    // Verify path belongs to user
    const [path] = await this.db
      .select()
      .from(schema.learningPaths)
      .where(
        and(
          eq(schema.learningPaths.id, pathId),
          eq(schema.learningPaths.orgId, orgId),
          eq(schema.learningPaths.employeeId, userId),
          eq(schema.learningPaths.isActive, true),
        ),
      )
      .limit(1);

    if (!path) throw new NotFoundException('Learning path not found');

    // Verify item belongs to path
    const [item] = await this.db
      .select()
      .from(schema.learningPathItems)
      .where(
        and(
          eq(schema.learningPathItems.id, itemId),
          eq(schema.learningPathItems.learningPathId, pathId),
          eq(schema.learningPathItems.orgId, orgId),
          eq(schema.learningPathItems.isActive, true),
        ),
      )
      .limit(1);

    if (!item) throw new NotFoundException('Learning path item not found');

    // Mark item as completed
    await this.db
      .update(schema.learningPathItems)
      .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.learningPathItems.id, itemId));

    // Recalculate path progress
    const allItems = await this.db
      .select()
      .from(schema.learningPathItems)
      .where(
        and(
          eq(schema.learningPathItems.learningPathId, pathId),
          eq(schema.learningPathItems.orgId, orgId),
          eq(schema.learningPathItems.isActive, true),
        ),
      );

    const totalItems = allItems.length;
    const completedItems = allItems.filter((i) => i.status === 'completed').length + (item.status !== 'completed' ? 1 : 0);
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const pathUpdates: Record<string, any> = {
      completedItems,
      progress,
      updatedAt: new Date(),
    };

    if (progress >= 100) {
      pathUpdates.status = 'completed';
      pathUpdates.completedAt = new Date();
    }

    await this.db
      .update(schema.learningPaths)
      .set(pathUpdates)
      .where(eq(schema.learningPaths.id, pathId));

    return {
      success: true,
      message: 'Item marked as complete',
      progress,
      completedItems,
      totalItems,
      pathCompleted: progress >= 100,
    };
  }
}
