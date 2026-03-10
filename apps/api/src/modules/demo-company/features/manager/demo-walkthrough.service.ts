import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class DemoWalkthroughService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getWalkthroughSteps(orgId: string, userId: string) {
    const tours = await this.db
      .select()
      .from(schema.demoTours)
      .where(
        and(
          eq(schema.demoTours.orgId, orgId),
          eq(schema.demoTours.isActive, true),
          eq(schema.demoTours.isPublished, true),
        ),
      )
      .orderBy(desc(schema.demoTours.updatedAt));

    const managerTours = tours.filter(
      (tour) => tour.assignedPersona === 'manager' || tour.assignedPersona === 'all',
    );

    return { data: managerTours, meta: { total: managerTours.length } };
  }

  async markStepComplete(orgId: string, userId: string, stepId: string) {
    return {
      data: {
        success: true,
        stepId,
        completedBy: userId,
        completedAt: new Date(),
      },
    };
  }
}
