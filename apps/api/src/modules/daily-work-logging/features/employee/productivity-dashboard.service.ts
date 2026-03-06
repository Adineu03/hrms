import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class ProductivityDashboardService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Full Productivity Summary ───────────────────────────────────────────
  async getProductivitySummary(
    orgId: string,
    employeeId: string,
    filters: { from?: string; to?: string },
  ) {
    const now = new Date();
    const to = filters.to || now.toISOString().slice(0, 10);
    const fromDefault = new Date(now);
    fromDefault.setDate(fromDefault.getDate() - 30);
    const from = filters.from || fromDefault.toISOString().slice(0, 10);

    // Get timesheet policy for expected hours
    const [policy] = await this.db
      .select()
      .from(schema.timesheetPolicies)
      .where(
        and(
          eq(schema.timesheetPolicies.orgId, orgId),
          eq(schema.timesheetPolicies.isDefault, true),
          eq(schema.timesheetPolicies.isActive, true),
        ),
      )
      .limit(1);

    const expectedHoursPerDay = policy ? Number(policy.minHoursPerDay || 8) : 8;
    const expectedHoursPerWeek = policy ? Number(policy.minHoursPerWeek || 40) : 40;

    // Total hours logged
    const [totals] = await this.db
      .select({
        totalHours: sql<string>`COALESCE(SUM(${schema.timesheetEntries.hours}::numeric), 0)`,
        billableHours: sql<string>`COALESCE(SUM(CASE WHEN ${schema.timesheetEntries.isBillable} THEN ${schema.timesheetEntries.hours}::numeric ELSE 0 END), 0)`,
        entryCount: sql<string>`count(*)`,
        uniqueDays: sql<string>`count(DISTINCT ${schema.timesheetEntries.date})`,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          gte(schema.timesheetEntries.date, from),
          lte(schema.timesheetEntries.date, to),
        ),
      );

    const totalHours = Number(totals?.totalHours || 0);
    const billableHours = Number(totals?.billableHours || 0);
    const nonBillableHours = totalHours - billableHours;
    const uniqueDays = parseInt(totals?.uniqueDays || '0', 10);
    const billableRatio = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;

    // Calculate expected hours for the period (business days)
    const businessDays = this.countBusinessDays(from, to);
    const expectedHours = businessDays * expectedHoursPerDay;
    const completionPercentage = expectedHours > 0
      ? Math.round((totalHours / expectedHours) * 100)
      : 0;

    // Project breakdown
    const projectBreakdown = await this.db
      .select({
        projectId: schema.timesheetEntries.projectId,
        projectName: schema.projects.name,
        projectCode: schema.projects.code,
        projectColor: schema.projects.color,
        totalHours: sql<string>`COALESCE(SUM(${schema.timesheetEntries.hours}::numeric), 0)`,
        billableHours: sql<string>`COALESCE(SUM(CASE WHEN ${schema.timesheetEntries.isBillable} THEN ${schema.timesheetEntries.hours}::numeric ELSE 0 END), 0)`,
        entryCount: sql<string>`count(*)`,
      })
      .from(schema.timesheetEntries)
      .leftJoin(schema.projects, eq(schema.timesheetEntries.projectId, schema.projects.id))
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          gte(schema.timesheetEntries.date, from),
          lte(schema.timesheetEntries.date, to),
        ),
      )
      .groupBy(
        schema.timesheetEntries.projectId,
        schema.projects.name,
        schema.projects.code,
        schema.projects.color,
      )
      .orderBy(sql`SUM(${schema.timesheetEntries.hours}::numeric) DESC`);

    // Daily trend for the period
    const dailyTrend = await this.db
      .select({
        date: schema.timesheetEntries.date,
        totalHours: sql<string>`COALESCE(SUM(${schema.timesheetEntries.hours}::numeric), 0)`,
        billableHours: sql<string>`COALESCE(SUM(CASE WHEN ${schema.timesheetEntries.isBillable} THEN ${schema.timesheetEntries.hours}::numeric ELSE 0 END), 0)`,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          gte(schema.timesheetEntries.date, from),
          lte(schema.timesheetEntries.date, to),
        ),
      )
      .groupBy(schema.timesheetEntries.date)
      .orderBy(asc(schema.timesheetEntries.date));

    // Average hours per day (only days with entries)
    const avgHoursPerDay = uniqueDays > 0 ? Math.round((totalHours / uniqueDays) * 100) / 100 : 0;

    return {
      period: { from, to },
      summary: {
        totalHours,
        billableHours,
        nonBillableHours,
        billableRatio,
        expectedHours,
        completionPercentage,
        daysWorked: uniqueDays,
        businessDays,
        avgHoursPerDay,
        totalEntries: parseInt(totals?.entryCount || '0', 10),
      },
      projectBreakdown: projectBreakdown.map((p) => ({
        projectId: p.projectId,
        projectName: p.projectName || 'No Project',
        projectCode: p.projectCode || '',
        projectColor: p.projectColor || '#6B7280',
        totalHours: Number(p.totalHours),
        billableHours: Number(p.billableHours),
        percentage: totalHours > 0 ? Math.round((Number(p.totalHours) / totalHours) * 100) : 0,
        entryCount: parseInt(p.entryCount, 10),
      })),
      dailyTrend: dailyTrend.map((d) => ({
        date: d.date,
        totalHours: Number(d.totalHours),
        billableHours: Number(d.billableHours),
        expectedHours: expectedHoursPerDay,
      })),
    };
  }

  // ── Category Breakdown ──────────────────────────────────────────────────
  async getCategoryBreakdown(
    orgId: string,
    employeeId: string,
    filters: { from?: string; to?: string },
  ) {
    const now = new Date();
    const to = filters.to || now.toISOString().slice(0, 10);
    const fromDefault = new Date(now);
    fromDefault.setDate(fromDefault.getDate() - 30);
    const from = filters.from || fromDefault.toISOString().slice(0, 10);

    const breakdown = await this.db
      .select({
        taskCategoryId: schema.timesheetEntries.taskCategoryId,
        categoryName: schema.taskCategories.name,
        categoryColor: schema.taskCategories.color,
        categoryType: schema.taskCategories.type,
        totalHours: sql<string>`COALESCE(SUM(${schema.timesheetEntries.hours}::numeric), 0)`,
        entryCount: sql<string>`count(*)`,
      })
      .from(schema.timesheetEntries)
      .leftJoin(schema.taskCategories, eq(schema.timesheetEntries.taskCategoryId, schema.taskCategories.id))
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          gte(schema.timesheetEntries.date, from),
          lte(schema.timesheetEntries.date, to),
        ),
      )
      .groupBy(
        schema.timesheetEntries.taskCategoryId,
        schema.taskCategories.name,
        schema.taskCategories.color,
        schema.taskCategories.type,
      )
      .orderBy(sql`SUM(${schema.timesheetEntries.hours}::numeric) DESC`);

    const totalHours = breakdown.reduce((s, b) => s + Number(b.totalHours), 0);

    return {
      period: { from, to },
      totalHours,
      categories: breakdown.map((b) => ({
        taskCategoryId: b.taskCategoryId,
        categoryName: b.categoryName || 'Uncategorized',
        categoryColor: b.categoryColor || '#6B7280',
        categoryType: b.categoryType || 'general',
        totalHours: Number(b.totalHours),
        percentage: totalHours > 0 ? Math.round((Number(b.totalHours) / totalHours) * 100) : 0,
        entryCount: parseInt(b.entryCount, 10),
      })),
    };
  }

  // ── Weekly Trend ────────────────────────────────────────────────────────
  async getWeeklyTrend(
    orgId: string,
    employeeId: string,
    filters: { weeks?: string; from?: string; to?: string },
  ) {
    const weeks = Math.min(52, Math.max(1, parseInt(filters.weeks || '8', 10)));
    const now = new Date();
    const to = filters.to || now.toISOString().slice(0, 10);
    const fromCalc = new Date(now);
    fromCalc.setDate(fromCalc.getDate() - weeks * 7);
    const from = filters.from || fromCalc.toISOString().slice(0, 10);

    // Group by ISO week
    const weeklyData = await this.db
      .select({
        weekNumber: sql<string>`TO_CHAR(${schema.timesheetEntries.date}::date, 'IYYY-IW')`,
        weekStart: sql<string>`DATE_TRUNC('week', ${schema.timesheetEntries.date}::date)::date`,
        totalHours: sql<string>`COALESCE(SUM(${schema.timesheetEntries.hours}::numeric), 0)`,
        billableHours: sql<string>`COALESCE(SUM(CASE WHEN ${schema.timesheetEntries.isBillable} THEN ${schema.timesheetEntries.hours}::numeric ELSE 0 END), 0)`,
        entryCount: sql<string>`count(*)`,
        uniqueDays: sql<string>`count(DISTINCT ${schema.timesheetEntries.date})`,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          gte(schema.timesheetEntries.date, from),
          lte(schema.timesheetEntries.date, to),
        ),
      )
      .groupBy(
        sql`TO_CHAR(${schema.timesheetEntries.date}::date, 'IYYY-IW')`,
        sql`DATE_TRUNC('week', ${schema.timesheetEntries.date}::date)::date`,
      )
      .orderBy(sql`DATE_TRUNC('week', ${schema.timesheetEntries.date}::date)::date`);

    // Get per-day data for the period
    const dailyData = await this.db
      .select({
        date: schema.timesheetEntries.date,
        dayOfWeek: sql<string>`EXTRACT(DOW FROM ${schema.timesheetEntries.date}::date)`,
        totalHours: sql<string>`COALESCE(SUM(${schema.timesheetEntries.hours}::numeric), 0)`,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          gte(schema.timesheetEntries.date, from),
          lte(schema.timesheetEntries.date, to),
        ),
      )
      .groupBy(
        schema.timesheetEntries.date,
        sql`EXTRACT(DOW FROM ${schema.timesheetEntries.date}::date)`,
      )
      .orderBy(asc(schema.timesheetEntries.date));

    return {
      period: { from, to, weeks },
      weeklyData: weeklyData.map((w) => ({
        weekNumber: w.weekNumber,
        weekStart: w.weekStart,
        totalHours: Number(w.totalHours),
        billableHours: Number(w.billableHours),
        nonBillableHours: Number(w.totalHours) - Number(w.billableHours),
        entryCount: parseInt(w.entryCount, 10),
        daysWorked: parseInt(w.uniqueDays, 10),
      })),
      dailyData: dailyData.map((d) => ({
        date: d.date,
        dayOfWeek: parseInt(d.dayOfWeek, 10),
        totalHours: Number(d.totalHours),
      })),
    };
  }

  // ── Utilization ─────────────────────────────────────────────────────────
  async getUtilization(
    orgId: string,
    employeeId: string,
    filters: { from?: string; to?: string },
  ) {
    const now = new Date();
    const to = filters.to || now.toISOString().slice(0, 10);
    const fromDefault = new Date(now);
    fromDefault.setDate(fromDefault.getDate() - 90);
    const from = filters.from || fromDefault.toISOString().slice(0, 10);

    // Get expected hours per day
    const [policy] = await this.db
      .select()
      .from(schema.timesheetPolicies)
      .where(
        and(
          eq(schema.timesheetPolicies.orgId, orgId),
          eq(schema.timesheetPolicies.isDefault, true),
          eq(schema.timesheetPolicies.isActive, true),
        ),
      )
      .limit(1);

    const expectedHoursPerDay = policy ? Number(policy.minHoursPerDay || 8) : 8;

    // Monthly utilization
    const monthlyData = await this.db
      .select({
        month: sql<string>`TO_CHAR(${schema.timesheetEntries.date}::date, 'YYYY-MM')`,
        totalHours: sql<string>`COALESCE(SUM(${schema.timesheetEntries.hours}::numeric), 0)`,
        billableHours: sql<string>`COALESCE(SUM(CASE WHEN ${schema.timesheetEntries.isBillable} THEN ${schema.timesheetEntries.hours}::numeric ELSE 0 END), 0)`,
        uniqueDays: sql<string>`count(DISTINCT ${schema.timesheetEntries.date})`,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          eq(schema.timesheetEntries.employeeId, employeeId),
          gte(schema.timesheetEntries.date, from),
          lte(schema.timesheetEntries.date, to),
        ),
      )
      .groupBy(sql`TO_CHAR(${schema.timesheetEntries.date}::date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${schema.timesheetEntries.date}::date, 'YYYY-MM')`);

    // Calculate utilization for each month
    const utilizationData = monthlyData.map((m) => {
      const year = parseInt(m.month.split('-')[0], 10);
      const month = parseInt(m.month.split('-')[1], 10) - 1;

      // Business days in the month (within the from-to range)
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      const effectiveStart = new Date(Math.max(monthStart.getTime(), new Date(from).getTime()));
      const effectiveEnd = new Date(Math.min(monthEnd.getTime(), new Date(to).getTime()));
      const businessDays = this.countBusinessDays(
        effectiveStart.toISOString().slice(0, 10),
        effectiveEnd.toISOString().slice(0, 10),
      );

      const expectedHours = businessDays * expectedHoursPerDay;
      const totalHours = Number(m.totalHours);
      const billableHours = Number(m.billableHours);

      return {
        month: m.month,
        totalHours,
        billableHours,
        expectedHours,
        daysWorked: parseInt(m.uniqueDays, 10),
        businessDays,
        utilization: expectedHours > 0 ? Math.round((totalHours / expectedHours) * 100) : 0,
        billableUtilization: expectedHours > 0 ? Math.round((billableHours / expectedHours) * 100) : 0,
      };
    });

    // Overall utilization
    const totalBusinessDays = this.countBusinessDays(from, to);
    const totalExpectedHours = totalBusinessDays * expectedHoursPerDay;
    const totalLoggedHours = utilizationData.reduce((s, m) => s + m.totalHours, 0);
    const totalBillableHours = utilizationData.reduce((s, m) => s + m.billableHours, 0);

    return {
      period: { from, to },
      overall: {
        totalLoggedHours,
        totalBillableHours,
        totalExpectedHours,
        totalBusinessDays,
        utilization: totalExpectedHours > 0 ? Math.round((totalLoggedHours / totalExpectedHours) * 100) : 0,
        billableUtilization: totalExpectedHours > 0 ? Math.round((totalBillableHours / totalExpectedHours) * 100) : 0,
      },
      monthly: utilizationData,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private countBusinessDays(from: string, to: string): number {
    let count = 0;
    const cursor = new Date(from);
    const end = new Date(to);

    while (cursor <= end) {
      const dayOfWeek = cursor.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return count;
  }
}
