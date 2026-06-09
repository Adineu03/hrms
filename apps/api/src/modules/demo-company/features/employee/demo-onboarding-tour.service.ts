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
  iconKey?: string;
}

const ICON_KEYS = ['attendance', 'leave', 'payslip', 'timesheet', 'course'] as const;

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

    // Flatten tour steps into the TourStep shape the UI expects.
    const steps: Array<{
      id: string;
      stepNumber: number;
      title: string;
      description: string;
      iconKey: (typeof ICON_KEYS)[number];
      completed: boolean;
    }> = [];

    let stepNumber = 0;
    for (const tour of employeeTours) {
      const tourSteps = Array.isArray(tour.steps) ? (tour.steps as RawTourStep[]) : [];
      for (let i = 0; i < tourSteps.length; i++) {
        const s = tourSteps[i] ?? {};
        const rawIcon = (s.iconKey ?? '').toLowerCase();
        const iconKey = (ICON_KEYS as readonly string[]).includes(rawIcon)
          ? (rawIcon as (typeof ICON_KEYS)[number])
          : ICON_KEYS[stepNumber % ICON_KEYS.length];
        stepNumber += 1;
        steps.push({
          id: `${tour.id}-${i}`,
          stepNumber,
          title: s.title ?? `Step ${stepNumber}`,
          description: s.description ?? s.tooltipText ?? s.tooltip ?? '',
          iconKey,
          completed: false,
        });
      }
    }

    return { data: steps, meta: { total: steps.length } };
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
