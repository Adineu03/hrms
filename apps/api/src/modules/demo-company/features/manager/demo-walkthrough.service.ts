import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

interface RawTourStep {
  order?: number;
  title?: string;
  tooltipText?: string;
  tooltip?: string;
  description?: string;
  targetSelector?: string;
}

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

    // Flatten each tour's step array into the WalkthroughStep shape the UI expects.
    const steps: Array<{
      id: string;
      stepNumber: number;
      title: string;
      description: string;
      featureRef: string;
      moduleRef: string;
      completed: boolean;
    }> = [];

    let stepNumber = 0;
    for (const tour of managerTours) {
      const tourSteps = Array.isArray(tour.steps) ? (tour.steps as RawTourStep[]) : [];
      for (let i = 0; i < tourSteps.length; i++) {
        const s = tourSteps[i] ?? {};
        stepNumber += 1;
        steps.push({
          id: `${tour.id}-${i}`,
          stepNumber,
          title: s.title ?? `Step ${stepNumber}`,
          description: s.description ?? s.tooltipText ?? s.tooltip ?? '',
          featureRef: tour.tourName ?? '',
          moduleRef: tour.targetModule ?? '',
          completed: false,
        });
      }
    }

    return { data: steps, meta: { total: steps.length } };
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
