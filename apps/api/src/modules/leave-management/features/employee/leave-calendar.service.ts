import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, and, gte, lte, or, ne } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LeaveCalendarService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Monthly Calendar View ───────────────────────────────────────────────
  async getMonthlyCalendar(orgId: string, userId: string, month: string, year: string) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

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

    // Get my leaves for this month
    const myLeaves = await this.db
      .select({
        id: schema.leaveRequests.id,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
        isHalfDay: schema.leaveRequests.isHalfDay,
        halfDayType: schema.leaveRequests.halfDayType,
        status: schema.leaveRequests.status,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeColor: schema.leaveTypes.color,
        leaveTypeCode: schema.leaveTypes.code,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.employeeId, userId),
          lte(schema.leaveRequests.fromDate, endDate),
          gte(schema.leaveRequests.toDate, startDate),
          or(
            eq(schema.leaveRequests.status, 'approved'),
            eq(schema.leaveRequests.status, 'pending'),
          ),
        ),
      );

    // Get team leaves (same manager)
    const [profile] = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.userId, userId),
        ),
      )
      .limit(1);

    let teamLeaves: any[] = [];
    if (profile?.managerId) {
      const teamMembers = await this.db
        .select({ userId: schema.employeeProfiles.userId })
        .from(schema.employeeProfiles)
        .where(
          and(
            eq(schema.employeeProfiles.orgId, orgId),
            eq(schema.employeeProfiles.managerId, profile.managerId),
            ne(schema.employeeProfiles.userId, userId),
          ),
        );

      const teamIds = teamMembers.map((t) => t.userId);
      if (teamIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        teamLeaves = await this.db
          .select({
            id: schema.leaveRequests.id,
            employeeId: schema.leaveRequests.employeeId,
            fromDate: schema.leaveRequests.fromDate,
            toDate: schema.leaveRequests.toDate,
            totalDays: schema.leaveRequests.totalDays,
            status: schema.leaveRequests.status,
            leaveTypeName: schema.leaveTypes.name,
            leaveTypeColor: schema.leaveTypes.color,
            employeeFirstName: schema.users.firstName,
            employeeLastName: schema.users.lastName,
          })
          .from(schema.leaveRequests)
          .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
          .innerJoin(schema.users, eq(schema.leaveRequests.employeeId, schema.users.id))
          .where(
            and(
              eq(schema.leaveRequests.orgId, orgId),
              inArray(schema.leaveRequests.employeeId, teamIds),
              lte(schema.leaveRequests.fromDate, endDate),
              gte(schema.leaveRequests.toDate, startDate),
              eq(schema.leaveRequests.status, 'approved'),
            ),
          );
      }
    }

    // Get holidays
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

    // Build per-day calendar
    const days: Record<string, any>[] = [];
    const cursor = new Date(y, m - 1, 1);
    while (cursor.getMonth() === m - 1) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const dayOfWeek = cursor.getDay();
      const isWeekend = weekendDays.includes(dayOfWeek);
      const holiday = holidays.find((h) => h.date === dateStr);

      // Find my leaves for this day
      const myLeavesForDay = myLeaves.filter((l) => l.fromDate <= dateStr && l.toDate >= dateStr);

      // Find team leaves for this day
      const teamLeavesForDay = teamLeaves.filter((l: any) => l.fromDate <= dateStr && l.toDate >= dateStr);

      days.push({
        date: dateStr,
        dayOfWeek: dayNames[dayOfWeek],
        isWeekend,
        isHoliday: !!holiday,
        holidayName: holiday?.name || null,
        holidayType: holiday?.type || null,
        myLeaves: myLeavesForDay.map((l) => ({
          id: l.id,
          leaveTypeName: l.leaveTypeName,
          leaveTypeColor: l.leaveTypeColor,
          status: l.status,
          isHalfDay: l.isHalfDay,
          halfDayType: l.halfDayType,
        })),
        teamLeaves: teamLeavesForDay.map((l: any) => ({
          id: l.id,
          employeeName: `${l.employeeFirstName} ${l.employeeLastName || ''}`.trim(),
          leaveTypeName: l.leaveTypeName,
          leaveTypeColor: l.leaveTypeColor,
        })),
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      month: m,
      year: y,
      days,
      summary: {
        totalDays: days.length,
        weekendDays: days.filter((d) => d.isWeekend).length,
        holidays: days.filter((d) => d.isHoliday).length,
        myLeaveDays: days.filter((d) => d.myLeaves.length > 0).length,
        teamLeaveDays: days.filter((d) => d.teamLeaves.length > 0).length,
      },
    };
  }

  // ── Daily Detail ────────────────────────────────────────────────────────
  async getDailyDetail(orgId: string, userId: string, date: string) {
    // Get org config
    const [org] = await this.db
      .select({ config: schema.orgs.config })
      .from(schema.orgs)
      .where(eq(schema.orgs.id, orgId))
      .limit(1);

    const workWeek = (org?.config as any)?.workWeek || {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = workWeek[dayNames[dayOfWeek]] === 'off' || workWeek[dayNames[dayOfWeek]] === false;

    // Check holiday
    const [holiday] = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          eq(schema.holidayCalendars.date, date),
        ),
      )
      .limit(1);

    // My leave status
    const myLeaves = await this.db
      .select({
        id: schema.leaveRequests.id,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
        isHalfDay: schema.leaveRequests.isHalfDay,
        halfDayType: schema.leaveRequests.halfDayType,
        status: schema.leaveRequests.status,
        reason: schema.leaveRequests.reason,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeColor: schema.leaveTypes.color,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          eq(schema.leaveRequests.employeeId, userId),
          lte(schema.leaveRequests.fromDate, date),
          gte(schema.leaveRequests.toDate, date),
          or(
            eq(schema.leaveRequests.status, 'approved'),
            eq(schema.leaveRequests.status, 'pending'),
          ),
        ),
      );

    // Team members on leave
    const [profile] = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.userId, userId),
        ),
      )
      .limit(1);

    let teamOnLeave: any[] = [];
    if (profile?.managerId) {
      const teamMembers = await this.db
        .select({ userId: schema.employeeProfiles.userId })
        .from(schema.employeeProfiles)
        .where(
          and(
            eq(schema.employeeProfiles.orgId, orgId),
            eq(schema.employeeProfiles.managerId, profile.managerId),
            ne(schema.employeeProfiles.userId, userId),
          ),
        );

      const teamIds = teamMembers.map((t) => t.userId);
      if (teamIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        teamOnLeave = await this.db
          .select({
            employeeId: schema.leaveRequests.employeeId,
            leaveTypeName: schema.leaveTypes.name,
            leaveTypeColor: schema.leaveTypes.color,
            status: schema.leaveRequests.status,
            employeeFirstName: schema.users.firstName,
            employeeLastName: schema.users.lastName,
          })
          .from(schema.leaveRequests)
          .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
          .innerJoin(schema.users, eq(schema.leaveRequests.employeeId, schema.users.id))
          .where(
            and(
              eq(schema.leaveRequests.orgId, orgId),
              inArray(schema.leaveRequests.employeeId, teamIds),
              lte(schema.leaveRequests.fromDate, date),
              gte(schema.leaveRequests.toDate, date),
              eq(schema.leaveRequests.status, 'approved'),
            ),
          );
      }
    }

    return {
      date,
      dayOfWeek: dayNames[dayOfWeek],
      isWeekend,
      isHoliday: !!holiday,
      holiday: holiday
        ? {
            name: holiday.name,
            type: holiday.type,
            description: holiday.description,
            isOptional: holiday.isOptional,
          }
        : null,
      myLeaves: myLeaves.map((l) => ({
        id: l.id,
        leaveTypeName: l.leaveTypeName,
        leaveTypeColor: l.leaveTypeColor,
        status: l.status,
        isHalfDay: l.isHalfDay,
        halfDayType: l.halfDayType,
        reason: l.reason,
        totalDays: Number(l.totalDays),
      })),
      teamOnLeave: teamOnLeave.map((t: any) => ({
        employeeId: t.employeeId,
        employeeName: `${t.employeeFirstName} ${t.employeeLastName || ''}`.trim(),
        leaveTypeName: t.leaveTypeName,
        leaveTypeColor: t.leaveTypeColor,
      })),
    };
  }

  // ── Team on Leave ───────────────────────────────────────────────────────
  async getTeamOnLeave(orgId: string, userId: string, date: string) {
    // Get employee's manager
    const [profile] = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.userId, userId),
        ),
      )
      .limit(1);

    if (!profile?.managerId) {
      return { teamOnLeave: [], total: 0 };
    }

    // Get team members
    const teamMembers = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, profile.managerId),
          ne(schema.employeeProfiles.userId, userId),
        ),
      );

    const teamIds = teamMembers.map((t) => t.userId);
    if (teamIds.length === 0) {
      return { teamOnLeave: [], total: 0 };
    }

    const { inArray } = await import('drizzle-orm');
    const results = await this.db
      .select({
        employeeId: schema.leaveRequests.employeeId,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
        isHalfDay: schema.leaveRequests.isHalfDay,
        status: schema.leaveRequests.status,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeColor: schema.leaveTypes.color,
        employeeFirstName: schema.users.firstName,
        employeeLastName: schema.users.lastName,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .innerJoin(schema.users, eq(schema.leaveRequests.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamIds),
          lte(schema.leaveRequests.fromDate, date),
          gte(schema.leaveRequests.toDate, date),
          eq(schema.leaveRequests.status, 'approved'),
        ),
      );

    return {
      date,
      teamOnLeave: results.map((r) => ({
        employeeId: r.employeeId,
        employeeName: `${r.employeeFirstName} ${r.employeeLastName || ''}`.trim(),
        fromDate: r.fromDate,
        toDate: r.toDate,
        totalDays: Number(r.totalDays),
        isHalfDay: r.isHalfDay,
        leaveTypeName: r.leaveTypeName,
        leaveTypeColor: r.leaveTypeColor,
      })),
      total: results.length,
    };
  }

  // ── Holidays for Year ───────────────────────────────────────────────────
  async getHolidays(orgId: string, userId: string, year?: string) {
    const targetYear = year || new Date().getFullYear().toString();

    // Get org work week config for weekend info
    const [org] = await this.db
      .select({ config: schema.orgs.config })
      .from(schema.orgs)
      .where(eq(schema.orgs.id, orgId))
      .limit(1);

    const workWeek = (org?.config as any)?.workWeek || {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekendDays: string[] = [];
    dayNames.forEach((day, index) => {
      if (workWeek[day] === 'off' || workWeek[day] === false) {
        weekendDays.push(day);
      }
    });

    // Get employee's location for filtering
    const [profile] = await this.db
      .select()
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.userId, userId),
        ),
      )
      .limit(1);

    const holidays = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          eq(schema.holidayCalendars.year, targetYear),
        ),
      )
      .orderBy(schema.holidayCalendars.date);

    // Filter by location if applicable
    const filtered = holidays.filter((h) => {
      const applicableLocations = h.applicableLocations as string[];
      if (!applicableLocations || applicableLocations.length === 0) return true;
      if (!profile?.locationId) return true;
      return applicableLocations.includes(profile.locationId);
    });

    return {
      year: targetYear,
      weekendDays,
      holidays: filtered.map((h) => ({
        id: h.id,
        name: h.name,
        date: h.date,
        type: h.type,
        description: h.description,
        isOptional: h.isOptional,
        isFloating: h.isFloating,
        dayOfWeek: new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' }),
      })),
      totalHolidays: filtered.length,
    };
  }

  // ── Long Weekends & Bridge Leave Suggestions ────────────────────────────
  async getLongWeekends(orgId: string, userId: string) {
    const now = new Date();
    const year = now.getFullYear().toString();

    // Get org work week config
    const [org] = await this.db
      .select({ config: schema.orgs.config })
      .from(schema.orgs)
      .where(eq(schema.orgs.id, orgId))
      .limit(1);

    const workWeek = (org?.config as any)?.workWeek || {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekendDayNums: number[] = [];
    dayNames.forEach((day, index) => {
      if (workWeek[day] === 'off' || workWeek[day] === false) {
        weekendDayNums.push(index);
      }
    });
    if (weekendDayNums.length === 0) {
      weekendDayNums.push(0, 6); // Default: Sat + Sun
    }

    // Get upcoming holidays
    const today = now.toISOString().slice(0, 10);
    const endOfYear = `${year}-12-31`;

    const holidays = await this.db
      .select()
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          gte(schema.holidayCalendars.date, today),
          lte(schema.holidayCalendars.date, endOfYear),
        ),
      )
      .orderBy(schema.holidayCalendars.date);

    const holidayDates = new Set(holidays.map((h) => h.date));
    const holidayMap = new Map(holidays.map((h) => [h.date, h]));

    const longWeekends: any[] = [];

    for (const holiday of holidays) {
      const holidayDate = new Date(holiday.date);
      const holidayDow = holidayDate.getDay();

      // Check days before and after holiday for weekend proximity
      const suggestions: any[] = [];
      let totalDaysOff = 1; // The holiday itself

      // Check if holiday is adjacent to a weekend
      // Look 1-2 days before and after for weekend/holiday combinations
      const checkRange = 3;
      let rangeStart = new Date(holidayDate);
      let rangeEnd = new Date(holidayDate);

      // Expand range backwards
      for (let i = 1; i <= checkRange; i++) {
        const checkDate = new Date(holidayDate);
        checkDate.setDate(checkDate.getDate() - i);
        const checkStr = checkDate.toISOString().slice(0, 10);
        const checkDow = checkDate.getDay();

        if (weekendDayNums.includes(checkDow) || holidayDates.has(checkStr)) {
          rangeStart = checkDate;
          totalDaysOff++;
        } else {
          // This is a working day — potential bridge leave
          const prevDate = new Date(checkDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevStr = prevDate.toISOString().slice(0, 10);
          const prevDow = prevDate.getDay();
          if (weekendDayNums.includes(prevDow) || holidayDates.has(prevStr)) {
            suggestions.push({
              date: checkStr,
              dayOfWeek: dayNames[checkDow],
              bridgeDays: 1,
              totalDaysOff: totalDaysOff + 2, // +1 bridge day +1 weekend/holiday before
            });
          }
          break;
        }
      }

      // Expand range forwards
      for (let i = 1; i <= checkRange; i++) {
        const checkDate = new Date(holidayDate);
        checkDate.setDate(checkDate.getDate() + i);
        const checkStr = checkDate.toISOString().slice(0, 10);
        const checkDow = checkDate.getDay();

        if (weekendDayNums.includes(checkDow) || holidayDates.has(checkStr)) {
          rangeEnd = checkDate;
          totalDaysOff++;
        } else {
          const nextDate = new Date(checkDate);
          nextDate.setDate(nextDate.getDate() + 1);
          const nextStr = nextDate.toISOString().slice(0, 10);
          const nextDow = nextDate.getDay();
          if (weekendDayNums.includes(nextDow) || holidayDates.has(nextStr)) {
            suggestions.push({
              date: checkStr,
              dayOfWeek: dayNames[checkDow],
              bridgeDays: 1,
              totalDaysOff: totalDaysOff + 2,
            });
          }
          break;
        }
      }

      if (totalDaysOff >= 3 || suggestions.length > 0) {
        longWeekends.push({
          holidayName: holiday.name,
          holidayDate: holiday.date,
          holidayDayOfWeek: dayNames[holidayDow],
          rangeStart: rangeStart.toISOString().slice(0, 10),
          rangeEnd: rangeEnd.toISOString().slice(0, 10),
          totalDaysOff,
          bridgeLeaveSuggestions: suggestions,
        });
      }
    }

    return { longWeekends };
  }
}
