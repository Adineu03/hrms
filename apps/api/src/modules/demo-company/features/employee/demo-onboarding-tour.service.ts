import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class DemoOnboardingTourService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getTourSteps(orgId: string, userId: string) {
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

    const employeeTours = tours.filter(
      (tour) => tour.assignedPersona === 'employee' || tour.assignedPersona === 'all',
    );

    return { data: employeeTours, meta: { total: employeeTours.length } };
  }

  async completeTour(orgId: string, userId: string) {
    return {
      data: {
        success: true,
        message: 'Welcome tour completed!',
        completedBy: userId,
        completedAt: new Date(),
      },
    };
  }
}
