import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

const FEATURE_HIGHLIGHTS = [
  {
    id: 'mark-attendance',
    title: 'Mark Attendance',
    description: 'Clock in and clock out with a single tap. Track your work hours effortlessly.',
    module: 'attendance',
    actionLabel: 'Go to Attendance',
    actionRoute: '/dashboard/attendance',
    icon: 'clock',
  },
  {
    id: 'apply-leave',
    title: 'Apply for Leave',
    description: 'Submit leave requests in seconds and track approvals in real time.',
    module: 'leave-management',
    actionLabel: 'Apply Leave',
    actionRoute: '/dashboard/leave-management',
    icon: 'calendar',
  },
  {
    id: 'view-payslip',
    title: 'View Your Payslip',
    description: 'Access your monthly payslip, tax deductions, and salary breakdown anytime.',
    module: 'payroll-processing',
    actionLabel: 'View Payslip',
    actionRoute: '/dashboard/payroll-processing',
    icon: 'document',
  },
  {
    id: 'submit-timesheet',
    title: 'Submit Timesheet',
    description: 'Log your daily work hours and project time with detailed descriptions.',
    module: 'daily-work-logging',
    actionLabel: 'Log Time',
    actionRoute: '/dashboard/daily-work-logging',
    icon: 'timer',
  },
  {
    id: 'complete-course',
    title: 'Complete a Course',
    description: 'Grow your skills by enrolling in courses from the learning library.',
    module: 'learning-development',
    actionLabel: 'Browse Courses',
    actionRoute: '/dashboard/learning-development',
    icon: 'book',
  },
];

@Injectable()
export class FeatureHighlightsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getHighlights(orgId: string, userId: string) {
    return { data: FEATURE_HIGHLIGHTS, meta: { total: FEATURE_HIGHLIGHTS.length } };
  }

  async dismissHighlights(orgId: string, userId: string) {
    return {
      data: {
        success: true,
        dismissed: true,
        dismissedBy: userId,
        dismissedAt: new Date(),
      },
    };
  }
}
