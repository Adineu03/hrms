import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LeaveInsightsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Leave Utilization Summary ───────────────────────────────────────────
  async getSummary(orgId: string, userId: string) {
    const year = new Date().getFullYear().toString();

    // Get all balances for current year
    const balances = await this.db
      .select({
        entitled: schema.leaveBalances.entitled,
        used: schema.leaveBalances.used,
        pending: schema.leaveBalances.pending,
        available: schema.leaveBalances.available,
      })
      .from(schema.leaveBalances)
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, userId),
          eq(schema.leaveBalances.year, year),
        ),
      );

    const totalEntitled = balances.reduce((sum, b) => sum + Number(b.entitled), 0);
    const totalUsed = balances.reduce((sum, b) => sum + Number(b.used), 0);
    const totalPending = balances.reduce((sum, b) => sum + Number(b.pending), 0);
    const totalAvailable = balances.reduce((sum, b) => sum + Number(b.available), 0);

    const utilizationPercentage = totalEntitled > 0
      ? Math.round((totalUsed / totalEntitled) * 100)
      : 0;

    // Calculate monthly average from approved requests this year
    const startDate = `${year}-01-01`;
    const now = new Date();
    const endDate = now.toISOString().slice(0, 10);

    const requests = await this.db
      .select({ totalDays: schema.leaveRequests.totalDays, fromDate: schema.leaveRequests.fromDate })
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.employeeId, userId),
          eq(schema.leaveRequests.status, 'approved'),
          gte(schema.leaveRequests.fromDate, startDate),
          lte(schema.leaveRequests.fromDate, endDate),
        ),
      );

    const currentMonth = now.getMonth() + 1; // Months elapsed in the year
    const totalDaysUsed = requests.reduce((sum, r) => sum + Number(r.totalDays), 0);
    const avgPerMonth = currentMonth > 0
      ? Math.round((totalDaysUsed / currentMonth) * 10) / 10
      : 0;

    // Trend direction: compare last 3 months vs previous 3 months
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentRequests = requests.filter(
      (r) => r.fromDate >= threeMonthsAgo.toISOString().slice(0, 10),
    );
    const olderRequests = requests.filter(
      (r) =>
        r.fromDate >= sixMonthsAgo.toISOString().slice(0, 10) &&
        r.fromDate < threeMonthsAgo.toISOString().slice(0, 10),
    );

    const recentAvg = recentRequests.reduce((sum, r) => sum + Number(r.totalDays), 0) / 3;
    const olderAvg = olderRequests.reduce((sum, r) => sum + Number(r.totalDays), 0) / 3;

    let trendDirection: string;
    if (recentAvg > olderAvg + 0.5) {
      trendDirection = 'increasing';
    } else if (recentAvg < olderAvg - 0.5) {
      trendDirection = 'decreasing';
    } else {
      trendDirection = 'stable';
    }

    return {
      year,
      totalEntitled,
      totalUsed,
      totalPending,
      totalAvailable,
      utilizationPercentage,
      avgPerMonth,
      trendDirection,
      totalRequests: requests.length,
    };
  }

  // ── Leave Type Breakdown ────────────────────────────────────────────────
  async getTypeBreakdown(orgId: string, userId: string) {
    const year = new Date().getFullYear().toString();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const results = await this.db
      .select({
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
        leaveTypeColor: schema.leaveTypes.color,
        totalDays: schema.leaveRequests.totalDays,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.employeeId, userId),
          eq(schema.leaveRequests.status, 'approved'),
          gte(schema.leaveRequests.fromDate, startDate),
          lte(schema.leaveRequests.fromDate, endDate),
        ),
      );

    // Aggregate by leave type
    const typeMap: Record<string, { name: string; code: string; color: string; totalDays: number }> = {};
    let grandTotal = 0;

    for (const r of results) {
      const days = Number(r.totalDays);
      grandTotal += days;

      if (!typeMap[r.leaveTypeName]) {
        typeMap[r.leaveTypeName] = {
          name: r.leaveTypeName,
          code: r.leaveTypeCode,
          color: r.leaveTypeColor || '#4F46E5',
          totalDays: 0,
        };
      }
      typeMap[r.leaveTypeName].totalDays += days;
    }

    // Build pie chart data with percentages
    const breakdown = Object.values(typeMap)
      .map((t) => ({
        ...t,
        percentage: grandTotal > 0 ? Math.round((t.totalDays / grandTotal) * 100) : 0,
      }))
      .sort((a, b) => b.totalDays - a.totalDays);

    return {
      year,
      breakdown,
      totalDaysUsed: grandTotal,
      mostUsedType: breakdown.length > 0 ? breakdown[0].name : null,
    };
  }

  // ── Monthly Trends ──────────────────────────────────────────────────────
  async getMonthlyTrends(orgId: string, userId: string) {
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const startDate = twelveMonthsAgo.toISOString().slice(0, 10);
    const endDate = now.toISOString().slice(0, 10);

    const requests = await this.db
      .select({
        fromDate: schema.leaveRequests.fromDate,
        totalDays: schema.leaveRequests.totalDays,
      })
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.employeeId, userId),
          eq(schema.leaveRequests.status, 'approved'),
          gte(schema.leaveRequests.fromDate, startDate),
          lte(schema.leaveRequests.fromDate, endDate),
        ),
      );

    // Build 12 month buckets
    const monthlyData: Record<string, { totalDays: number; requestCount: number }> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (11 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { totalDays: 0, requestCount: 0 };
    }

    for (const r of requests) {
      const key = r.fromDate.slice(0, 7);
      if (monthlyData[key]) {
        monthlyData[key].totalDays += Number(r.totalDays);
        monthlyData[key].requestCount++;
      }
    }

    const months = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      totalDays: data.totalDays,
      requestCount: data.requestCount,
    }));

    // Calculate moving average
    const movingAvg = months.map((m, i) => {
      const window = months.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((sum, w) => sum + w.totalDays, 0) / window.length;
      return { month: m.month, movingAvg: Math.round(avg * 10) / 10 };
    });

    return { months, movingAverage: movingAvg };
  }

  // ── Remaining Leave Projection ──────────────────────────────────────────
  async getProjection(orgId: string, userId: string) {
    const now = new Date();
    const year = now.getFullYear().toString();
    const currentMonth = now.getMonth() + 1;
    const remainingMonths = 12 - currentMonth;

    // Get current balances
    const balances = await this.db
      .select({
        leaveTypeId: schema.leaveBalances.leaveTypeId,
        entitled: schema.leaveBalances.entitled,
        used: schema.leaveBalances.used,
        pending: schema.leaveBalances.pending,
        available: schema.leaveBalances.available,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
        leaveTypeColor: schema.leaveTypes.color,
      })
      .from(schema.leaveBalances)
      .innerJoin(schema.leaveTypes, eq(schema.leaveBalances.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, userId),
          eq(schema.leaveBalances.year, year),
          eq(schema.leaveTypes.isActive, true),
        ),
      );

    const projections = balances.map((b) => {
      const used = Number(b.used);
      const available = Number(b.available);
      const entitled = Number(b.entitled);

      // Average monthly usage rate
      const avgMonthlyUsage = currentMonth > 0 ? used / currentMonth : 0;

      // Projected months until exhaustion
      const monthsUntilExhaustion = avgMonthlyUsage > 0
        ? Math.round((available / avgMonthlyUsage) * 10) / 10
        : null;

      // Projected remaining at year end
      const projectedUsage = avgMonthlyUsage * remainingMonths;
      const projectedRemainingAtYearEnd = Math.max(0, available - projectedUsage);

      // Exhaustion date estimate
      let estimatedExhaustionDate: string | null = null;
      if (monthsUntilExhaustion !== null && monthsUntilExhaustion < remainingMonths) {
        const exhaustionDate = new Date(now);
        exhaustionDate.setMonth(exhaustionDate.getMonth() + Math.floor(monthsUntilExhaustion));
        estimatedExhaustionDate = exhaustionDate.toISOString().slice(0, 10);
      }

      return {
        leaveTypeName: b.leaveTypeName,
        leaveTypeCode: b.leaveTypeCode,
        leaveTypeColor: b.leaveTypeColor,
        entitled,
        used,
        available,
        avgMonthlyUsage: Math.round(avgMonthlyUsage * 10) / 10,
        monthsUntilExhaustion,
        projectedRemainingAtYearEnd: Math.round(projectedRemainingAtYearEnd * 10) / 10,
        estimatedExhaustionDate,
        willExhaustBeforeYearEnd: monthsUntilExhaustion !== null && monthsUntilExhaustion < remainingMonths,
      };
    });

    return {
      year,
      currentMonth,
      remainingMonths,
      projections,
    };
  }

  // ── Leave Balance Health Indicator ──────────────────────────────────────
  async getHealthIndicator(orgId: string, userId: string) {
    const year = new Date().getFullYear().toString();

    const balances = await this.db
      .select({
        leaveTypeId: schema.leaveBalances.leaveTypeId,
        entitled: schema.leaveBalances.entitled,
        used: schema.leaveBalances.used,
        available: schema.leaveBalances.available,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
        leaveTypeColor: schema.leaveTypes.color,
      })
      .from(schema.leaveBalances)
      .innerJoin(schema.leaveTypes, eq(schema.leaveBalances.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveBalances.orgId, orgId),
          eq(schema.leaveBalances.employeeId, userId),
          eq(schema.leaveBalances.year, year),
          eq(schema.leaveTypes.isActive, true),
        ),
      );

    let totalEntitled = 0;
    let totalUsed = 0;

    const indicators = balances.map((b) => {
      const entitled = Number(b.entitled);
      const used = Number(b.used);
      const available = Number(b.available);
      totalEntitled += entitled;
      totalUsed += used;

      const usageRate = entitled > 0 ? (used / entitled) * 100 : 0;

      let status: 'green' | 'yellow' | 'red';
      let message: string;

      if (usageRate < 60) {
        status = 'green';
        message = 'Healthy balance remaining';
      } else if (usageRate < 85) {
        status = 'yellow';
        message = 'Balance getting low — plan ahead';
      } else {
        status = 'red';
        message = 'Balance critically low';
      }

      return {
        leaveTypeName: b.leaveTypeName,
        leaveTypeCode: b.leaveTypeCode,
        leaveTypeColor: b.leaveTypeColor,
        entitled,
        used,
        available,
        usageRate: Math.round(usageRate),
        status,
        message,
      };
    });

    // Overall health
    const overallUsageRate = totalEntitled > 0 ? (totalUsed / totalEntitled) * 100 : 0;
    let overallStatus: 'green' | 'yellow' | 'red';
    if (overallUsageRate < 60) {
      overallStatus = 'green';
    } else if (overallUsageRate < 85) {
      overallStatus = 'yellow';
    } else {
      overallStatus = 'red';
    }

    return {
      year,
      overallStatus,
      overallUsageRate: Math.round(overallUsageRate),
      indicators,
      redCount: indicators.filter((i) => i.status === 'red').length,
      yellowCount: indicators.filter((i) => i.status === 'yellow').length,
      greenCount: indicators.filter((i) => i.status === 'green').length,
    };
  }

  // ── Attendance vs Leave Correlation ─────────────────────────────────────
  async getAttendanceCorrelation(orgId: string, userId: string) {
    const now = new Date();
    const year = now.getFullYear().toString();
    const startDate = `${year}-01-01`;
    const endDate = now.toISOString().slice(0, 10);

    // Get attendance records for the year
    const attendanceRecords = await this.db
      .select({
        date: schema.attendanceRecords.date,
        status: schema.attendanceRecords.status,
        totalWorkMinutes: schema.attendanceRecords.totalWorkMinutes,
      })
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          gte(schema.attendanceRecords.date, startDate),
          lte(schema.attendanceRecords.date, endDate),
        ),
      );

    // Get leave requests for the year
    const leaveRequests = await this.db
      .select({
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
      })
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.employeeId, userId),
          eq(schema.leaveRequests.status, 'approved'),
          gte(schema.leaveRequests.fromDate, startDate),
          lte(schema.leaveRequests.fromDate, endDate),
        ),
      );

    // Get working days count
    const [org] = await this.db
      .select({ config: schema.orgs.config })
      .from(schema.orgs)
      .where(eq(schema.orgs.id, orgId))
      .limit(1);

    const workWeek = (org?.config as any)?.workWeek || {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekendDays: number[] = [];
    dayNames.forEach((day, index) => {
      if (workWeek[day] === 'off' || workWeek[day] === false) {
        weekendDays.push(index);
      }
    });
    if (weekendDays.length === 0) {
      weekendDays.push(0, 6);
    }

    // Count total working days in period
    let totalWorkingDays = 0;
    const cursor = new Date(startDate);
    const end = new Date(endDate);
    while (cursor <= end) {
      if (!weekendDays.includes(cursor.getDay())) {
        totalWorkingDays++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const daysPresent = attendanceRecords.filter(
      (r) => r.status === 'present' || r.status === 'late' || r.status === 'wfh',
    ).length;

    const totalLeaveDays = leaveRequests.reduce((sum, r) => sum + Number(r.totalDays), 0);
    const totalWorkHours = attendanceRecords.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0) / 60;

    // Monthly breakdown
    const monthlyCorrelation: Record<string, { present: number; onLeave: number; workHours: number }> = {};
    const currentMonth = now.getMonth() + 1;
    for (let m = 1; m <= currentMonth; m++) {
      const key = `${year}-${String(m).padStart(2, '0')}`;
      monthlyCorrelation[key] = { present: 0, onLeave: 0, workHours: 0 };
    }

    for (const r of attendanceRecords) {
      const monthKey = r.date.slice(0, 7);
      if (monthlyCorrelation[monthKey]) {
        if (r.status === 'present' || r.status === 'late' || r.status === 'wfh') {
          monthlyCorrelation[monthKey].present++;
        }
        monthlyCorrelation[monthKey].workHours += (r.totalWorkMinutes || 0) / 60;
      }
    }

    for (const r of leaveRequests) {
      const monthKey = r.fromDate.slice(0, 7);
      if (monthlyCorrelation[monthKey]) {
        monthlyCorrelation[monthKey].onLeave += Number(r.totalDays);
      }
    }

    const months = Object.entries(monthlyCorrelation).map(([month, data]) => ({
      month,
      daysPresent: data.present,
      daysOnLeave: data.onLeave,
      workHours: Math.round(data.workHours * 10) / 10,
    }));

    // Attendance rate
    const attendanceRate = totalWorkingDays > 0
      ? Math.round((daysPresent / totalWorkingDays) * 100)
      : 100;

    // Leave rate
    const leaveRate = totalWorkingDays > 0
      ? Math.round((totalLeaveDays / totalWorkingDays) * 100)
      : 0;

    return {
      year,
      totalWorkingDays,
      daysPresent,
      totalLeaveDays,
      totalWorkHours: Math.round(totalWorkHours * 10) / 10,
      avgWorkHoursPerDay: daysPresent > 0
        ? Math.round((totalWorkHours / daysPresent) * 10) / 10
        : 0,
      attendanceRate,
      leaveRate,
      months,
    };
  }
}
