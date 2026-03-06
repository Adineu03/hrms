import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ReportingAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getCompletionRates(orgId: string, filters: { courseId?: string; departmentId?: string }) {
    const conditions: any[] = [
      eq(schema.courseEnrollments.orgId, orgId),
      eq(schema.courseEnrollments.isActive, true),
    ];
    if (filters.courseId) conditions.push(eq(schema.courseEnrollments.courseId, filters.courseId));

    let enrollments = await this.db
      .select()
      .from(schema.courseEnrollments)
      .where(and(...conditions));

    // If department filter, get employee IDs for that department
    if (filters.departmentId) {
      const deptEmployees = await this.db
        .select({ userId: schema.employeeProfiles.userId })
        .from(schema.employeeProfiles)
        .where(
          and(
            eq(schema.employeeProfiles.orgId, orgId),
            eq(schema.employeeProfiles.departmentId, filters.departmentId),
          ),
        );
      const deptEmployeeIds = deptEmployees.map((e) => e.userId);
      enrollments = enrollments.filter((e) => deptEmployeeIds.includes(e.employeeId));
    }

    const total = enrollments.length;
    const completed = enrollments.filter((e) => e.status === 'completed').length;
    const inProgress = enrollments.filter((e) => e.status === 'in_progress').length;
    const notStarted = enrollments.filter((e) => e.status === 'enrolled').length;
    const dropped = enrollments.filter((e) => e.status === 'dropped').length;

    // Group by course
    const byCourse: Record<string, { courseId: string; total: number; completed: number; rate: number }> = {};
    for (const e of enrollments) {
      if (!byCourse[e.courseId]) byCourse[e.courseId] = { courseId: e.courseId, total: 0, completed: 0, rate: 0 };
      byCourse[e.courseId].total++;
      if (e.status === 'completed') byCourse[e.courseId].completed++;
    }
    for (const c of Object.values(byCourse)) {
      c.rate = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
    }

    return {
      total,
      completed,
      inProgress,
      notStarted,
      dropped,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      byCourse: Object.values(byCourse),
    };
  }

  async getEngagementMetrics(orgId: string) {
    const enrollments = await this.db
      .select()
      .from(schema.courseEnrollments)
      .where(
        and(
          eq(schema.courseEnrollments.orgId, orgId),
          eq(schema.courseEnrollments.isActive, true),
        ),
      );

    const totalLearners = new Set(enrollments.map((e) => e.employeeId)).size;
    const totalEnrollments = enrollments.length;
    const totalTimeSpent = enrollments.reduce((sum, e) => sum + (e.timeSpent ?? 0), 0);
    const avgTimePerLearner = totalLearners > 0 ? Math.round(totalTimeSpent / totalLearners) : 0;
    const avgProgress = totalEnrollments > 0
      ? Math.round(enrollments.reduce((sum, e) => sum + e.progress, 0) / totalEnrollments)
      : 0;

    // Active learners (accessed in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeLearners = new Set(
      enrollments
        .filter((e) => e.lastAccessedAt && new Date(e.lastAccessedAt) >= thirtyDaysAgo)
        .map((e) => e.employeeId),
    ).size;

    return {
      totalLearners,
      activeLearners,
      totalEnrollments,
      totalTimeSpentMinutes: totalTimeSpent,
      avgTimePerLearnerMinutes: avgTimePerLearner,
      avgProgress,
      engagementRate: totalLearners > 0 ? Math.round((activeLearners / totalLearners) * 100) : 0,
    };
  }

  async getPopularContent(orgId: string) {
    const courses = await this.db
      .select()
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.orgId, orgId),
          eq(schema.courses.isActive, true),
        ),
      )
      .orderBy(desc(schema.courses.totalEnrollments));

    const enrollments = await this.db
      .select()
      .from(schema.courseEnrollments)
      .where(
        and(
          eq(schema.courseEnrollments.orgId, orgId),
          eq(schema.courseEnrollments.isActive, true),
        ),
      );

    // Compute actual enrollment counts and ratings
    const courseStats: Record<string, { enrollments: number; completions: number; ratings: number[]; totalTime: number }> = {};
    for (const e of enrollments) {
      if (!courseStats[e.courseId]) courseStats[e.courseId] = { enrollments: 0, completions: 0, ratings: [], totalTime: 0 };
      courseStats[e.courseId].enrollments++;
      if (e.status === 'completed') courseStats[e.courseId].completions++;
      if (e.rating) courseStats[e.courseId].ratings.push(e.rating);
      courseStats[e.courseId].totalTime += e.timeSpent ?? 0;
    }

    const popularCourses = courses
      .map((c) => {
        const stats = courseStats[c.id] ?? { enrollments: 0, completions: 0, ratings: [], totalTime: 0 };
        const avgRating = stats.ratings.length > 0
          ? (stats.ratings.reduce((s, r) => s + r, 0) / stats.ratings.length).toFixed(1)
          : null;
        return {
          courseId: c.id,
          title: c.title,
          type: c.type,
          format: c.format,
          difficulty: c.difficulty,
          enrollments: stats.enrollments,
          completions: stats.completions,
          completionRate: stats.enrollments > 0 ? Math.round((stats.completions / stats.enrollments) * 100) : 0,
          avgRating,
          totalTimeSpent: stats.totalTime,
        };
      })
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 20);

    return { data: popularCourses, meta: { total: popularCourses.length } };
  }

  async getBudgetUtilization(orgId: string, fiscalYear?: string) {
    const conditions: any[] = [
      eq(schema.learningBudgets.orgId, orgId),
      eq(schema.learningBudgets.isActive, true),
    ];
    if (fiscalYear) conditions.push(eq(schema.learningBudgets.fiscalYear, fiscalYear));

    const budgets = await this.db
      .select()
      .from(schema.learningBudgets)
      .where(and(...conditions));

    const departments = await this.db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.orgId, orgId));

    const deptNames: Record<string, string> = {};
    for (const d of departments) deptNames[d.id] = d.name;

    let totalBudget = 0;
    let totalSpent = 0;
    const byDepartment: Array<{
      departmentId: string;
      departmentName: string;
      totalBudget: number;
      spent: number;
      remaining: number;
      utilization: number;
    }> = [];

    for (const b of budgets) {
      const budget = Number(b.totalBudget);
      const spent = Number(b.spentAmount);
      totalBudget += budget;
      totalSpent += spent;

      if (b.departmentId) {
        byDepartment.push({
          departmentId: b.departmentId,
          departmentName: deptNames[b.departmentId] ?? 'Unknown',
          totalBudget: budget,
          spent,
          remaining: Number(b.remainingAmount),
          utilization: budget > 0 ? Math.round((spent / budget) * 100) : 0,
        });
      }
    }

    return {
      totalBudget,
      totalSpent,
      totalRemaining: totalBudget - totalSpent,
      overallUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      byDepartment,
    };
  }
}
