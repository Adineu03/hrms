import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class AttendanceInsightsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Punctuality Score ─────────────────────────────────────────────────
  async getPunctuality(orgId: string, userId: string) {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = now.toISOString().slice(0, 10);

    const records = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          gte(schema.attendanceRecords.date, startDate),
          lte(schema.attendanceRecords.date, endDate),
        ),
      );

    let totalDays = records.length;
    let onTimeDays = 0;
    let lateDays = 0;
    let totalLateMinutes = 0;

    for (const r of records) {
      if (r.lateMinutes && r.lateMinutes > 0) {
        lateDays++;
        totalLateMinutes += r.lateMinutes;
      } else if (r.clockIn) {
        onTimeDays++;
      }
    }

    const score = totalDays > 0 ? Math.round((onTimeDays / totalDays) * 100) : 100;
    const averageLateMinutes = lateDays > 0 ? Math.round(totalLateMinutes / lateDays) : 0;

    // Compare to last month for rank
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
    const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;

    const prevRecords = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          gte(schema.attendanceRecords.date, prevStartDate),
          lte(schema.attendanceRecords.date, prevEndDate),
        ),
      );

    let prevOnTimeDays = 0;
    let prevTotalDays = prevRecords.length;
    for (const r of prevRecords) {
      if (!r.lateMinutes || r.lateMinutes === 0) {
        if (r.clockIn) prevOnTimeDays++;
      }
    }
    const prevScore = prevTotalDays > 0 ? Math.round((prevOnTimeDays / prevTotalDays) * 100) : 100;

    let rank: string;
    if (score > prevScore) {
      rank = 'improved';
    } else if (score < prevScore) {
      rank = 'declined';
    } else {
      rank = 'same';
    }

    return {
      totalDays,
      onTimeDays,
      lateDays,
      score,
      averageLateMinutes,
      rank,
      previousMonthScore: prevScore,
      scoreDelta: score - prevScore,
    };
  }

  // ── Work Hours Analysis ───────────────────────────────────────────────
  async getWorkHours(orgId: string, userId: string) {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = now.toISOString().slice(0, 10);

    const records = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          gte(schema.attendanceRecords.date, startDate),
          lte(schema.attendanceRecords.date, endDate),
        ),
      );

    let totalWorkMinutes = 0;
    let daysWithData = 0;

    for (const r of records) {
      if (r.totalWorkMinutes && r.totalWorkMinutes > 0) {
        totalWorkMinutes += r.totalWorkMinutes;
        daysWithData++;
      }
    }

    const avgPerDay = daysWithData > 0
      ? Math.round((totalWorkMinutes / daysWithData / 60) * 10) / 10
      : 0;

    // Calculate weekly average (approximate)
    const weeksInPeriod = Math.max(1, Math.ceil(daysWithData / 5));
    const avgPerWeek = Math.round((totalWorkMinutes / weeksInPeriod / 60) * 10) / 10;

    // Get team average (all employees in same org for this month)
    const teamRecords = await this.db
      .select({
        totalWork: sql<number>`coalesce(sum(${schema.attendanceRecords.totalWorkMinutes}), 0)::int`,
        totalCount: sql<number>`count(*)::int`,
      })
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          gte(schema.attendanceRecords.date, startDate),
          lte(schema.attendanceRecords.date, endDate),
        ),
      );

    const teamTotal = teamRecords[0]?.totalWork || 0;
    const teamCount = teamRecords[0]?.totalCount || 1;
    const teamAvgPerDay = Math.round((teamTotal / teamCount / 60) * 10) / 10;

    // Trend: last 4 weeks
    const trend: Record<string, any>[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);

      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const weekEndStr = weekEnd.toISOString().slice(0, 10);

      const weekRecords = records.filter((r) => r.date >= weekStartStr && r.date <= weekEndStr);
      let weekMinutes = 0;
      let weekDays = 0;
      for (const r of weekRecords) {
        if (r.totalWorkMinutes && r.totalWorkMinutes > 0) {
          weekMinutes += r.totalWorkMinutes;
          weekDays++;
        }
      }

      trend.push({
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        avgHours: weekDays > 0 ? Math.round((weekMinutes / weekDays / 60) * 10) / 10 : 0,
        totalHours: Math.round((weekMinutes / 60) * 10) / 10,
      });
    }

    let comparedToTeamAvg: string;
    if (avgPerDay > teamAvgPerDay + 0.5) {
      comparedToTeamAvg = 'above_average';
    } else if (avgPerDay < teamAvgPerDay - 0.5) {
      comparedToTeamAvg = 'below_average';
    } else {
      comparedToTeamAvg = 'on_par';
    }

    return {
      avgPerDay,
      avgPerWeek,
      totalHoursThisMonth: Math.round((totalWorkMinutes / 60) * 10) / 10,
      daysWorked: daysWithData,
      comparedToTeamAvg,
      teamAvgPerDay,
      trend,
    };
  }

  // ── Attendance Streak ─────────────────────────────────────────────────
  async getStreak(orgId: string, userId: string) {
    // Get all attendance records ordered by date descending
    const records = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
        ),
      )
      .orderBy(desc(schema.attendanceRecords.date));

    // Get org work week config
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

    // Get holidays
    const holidays = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(eq(schema.holidayCalendars.orgId, orgId));
    const holidayDates = new Set(holidays.map((h) => h.date));

    const recordDates = new Set(
      records
        .filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'wfh')
        .map((r) => r.date),
    );

    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastBreakDate: string | null = null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Walk backwards from today
    const cursor = new Date(today);
    let streakBroken = false;

    for (let i = 0; i < 365; i++) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const dayOfWeek = cursor.getDay();

      // Skip weekends and holidays
      if (weekendDays.includes(dayOfWeek) || holidayDates.has(dateStr)) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }

      if (recordDates.has(dateStr)) {
        if (!streakBroken) {
          currentStreak++;
        }
        tempStreak++;
      } else {
        if (!streakBroken) {
          streakBroken = true;
          lastBreakDate = dateStr;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }

      cursor.setDate(cursor.getDate() - 1);
    }

    longestStreak = Math.max(longestStreak, tempStreak);
    // If streak never broke, currentStreak is also the longest
    longestStreak = Math.max(longestStreak, currentStreak);

    return {
      currentStreak,
      longestStreak,
      lastBreakDate,
    };
  }

  // ── Break Analysis ────────────────────────────────────────────────────
  async getBreakAnalysis(orgId: string, userId: string) {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = now.toISOString().slice(0, 10);

    // Get attendance records for the month
    const records = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          gte(schema.attendanceRecords.date, startDate),
          lte(schema.attendanceRecords.date, endDate),
        ),
      );

    // Get all breaks for these records
    const recordIds = records.map((r) => r.id);
    let allBreaks: (typeof schema.attendanceBreaks.$inferSelect)[] = [];

    if (recordIds.length > 0) {
      // Fetch breaks for all records
      for (const recordId of recordIds) {
        const breaks = await this.db
          .select()
          .from(schema.attendanceBreaks)
          .where(eq(schema.attendanceBreaks.attendanceRecordId, recordId));
        allBreaks.push(...breaks);
      }
    }

    // Aggregate by type
    const byType: Record<string, { totalMinutes: number; count: number }> = {};
    let totalBreakMinutes = 0;

    for (const b of allBreaks) {
      const duration = b.durationMinutes || 0;
      totalBreakMinutes += duration;

      const type = b.breakType || 'general';
      if (!byType[type]) {
        byType[type] = { totalMinutes: 0, count: 0 };
      }
      byType[type].totalMinutes += duration;
      byType[type].count++;
    }

    const daysWithBreaks = new Set(
      allBreaks.map((b) => {
        // Find which record this break belongs to
        const record = records.find((r) => r.id === b.attendanceRecordId);
        return record?.date;
      }),
    ).size;

    const avgBreakMinutes = daysWithBreaks > 0
      ? Math.round(totalBreakMinutes / daysWithBreaks)
      : 0;

    // Get policy break config for comparison
    const policy = await this.getPolicy(orgId);
    const policyBreakMinutes = policy
      ? (policy.fullDayThresholdMinutes || 480) * 0.125 // rough: ~60 min break per 8hr day
      : 60;

    let comparedToPolicy: string;
    if (avgBreakMinutes > policyBreakMinutes + 10) {
      comparedToPolicy = 'above_policy';
    } else if (avgBreakMinutes < policyBreakMinutes - 10) {
      comparedToPolicy = 'below_policy';
    } else {
      comparedToPolicy = 'within_policy';
    }

    // Format byType for output
    const byTypeOutput: Record<string, number> = {};
    for (const [type, data] of Object.entries(byType)) {
      byTypeOutput[type] = Math.round(data.totalMinutes / Math.max(1, data.count));
    }

    return {
      avgBreakMinutes,
      totalBreakMinutes,
      daysWithBreaks,
      totalBreaks: allBreaks.length,
      byType: byTypeOutput,
      comparedToPolicy,
      policyBreakMinutes: Math.round(policyBreakMinutes),
    };
  }

  // ── Achievements ──────────────────────────────────────────────────────
  async getAchievements(orgId: string, userId: string) {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = now.toISOString().slice(0, 10);

    const records = await this.db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.orgId, orgId),
          eq(schema.attendanceRecords.employeeId, userId),
          gte(schema.attendanceRecords.date, startDate),
          lte(schema.attendanceRecords.date, endDate),
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

    const holidays = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          gte(schema.holidayCalendars.date, startDate),
          lte(schema.holidayCalendars.date, endDate),
        ),
      );
    const holidayDates = new Set(holidays.map((h) => h.date));

    let totalWorkDays = 0;
    const cursor = new Date(y, m - 1, 1);
    while (cursor <= now && cursor.getMonth() === m - 1) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (!weekendDays.includes(cursor.getDay()) && !holidayDates.has(dateStr)) {
        totalWorkDays++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    let presentDays = 0;
    let onTimeDays = 0;
    let lateDays = 0;
    let totalWorkMinutes = 0;
    let overtimeDays = 0;

    for (const r of records) {
      if (r.status === 'present' || r.status === 'late' || r.status === 'wfh') {
        presentDays++;
      }
      if (!r.lateMinutes || r.lateMinutes === 0) {
        if (r.clockIn) onTimeDays++;
      } else {
        lateDays++;
      }
      totalWorkMinutes += r.totalWorkMinutes || 0;
      if (r.isOvertime) overtimeDays++;
    }

    const onTimePercentage = presentDays > 0
      ? Math.round((onTimeDays / presentDays) * 100)
      : 100;

    const perfectAttendance = presentDays >= totalWorkDays && lateDays === 0;

    // Generate badges
    const badges: string[] = [];

    if (perfectAttendance) {
      badges.push('Perfect Attendance');
    }
    if (onTimePercentage >= 95) {
      badges.push('Punctuality Champion');
    }
    if (onTimePercentage >= 80 && onTimePercentage < 95) {
      badges.push('Consistent Performer');
    }
    if (presentDays >= 20) {
      badges.push('Full Month Warrior');
    }
    if (overtimeDays >= 5) {
      badges.push('Extra Miler');
    }
    if (lateDays === 0 && presentDays > 0) {
      badges.push('Zero Late Days');
    }
    if (totalWorkMinutes > 0) {
      const avgHours = totalWorkMinutes / presentDays / 60;
      if (avgHours >= 9) {
        badges.push('Hard Worker');
      }
    }

    return {
      perfectAttendance,
      onTimePercentage,
      totalWorkDays,
      presentDays,
      lateDays,
      overtimeDays,
      avgWorkHoursPerDay: presentDays > 0
        ? Math.round((totalWorkMinutes / presentDays / 60) * 10) / 10
        : 0,
      badges,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async getPolicy(orgId: string) {
    const [policy] = await this.db
      .select()
      .from(schema.attendancePolicies)
      .where(
        and(
          eq(schema.attendancePolicies.orgId, orgId),
          eq(schema.attendancePolicies.isDefault, true),
          eq(schema.attendancePolicies.isActive, true),
        ),
      )
      .limit(1);

    return policy || null;
  }
}
