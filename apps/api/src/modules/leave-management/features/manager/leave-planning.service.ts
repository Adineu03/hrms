import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, gte, lte, inArray, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LeavePlanningService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMembersWithNames(orgId: string, managerId: string) {
    return this.db
      .select({
        userId: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        departmentName: schema.departments.name,
      })
      .from(schema.users)
      .innerJoin(schema.employeeProfiles, eq(schema.users.id, schema.employeeProfiles.userId))
      .leftJoin(schema.departments, eq(schema.employeeProfiles.departmentId, schema.departments.id))
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
          eq(schema.users.isActive, true),
        ),
      );
  }

  async getAvailabilityCalendar(orgId: string, managerId: string, month: number, year: number) {
    const teamMembers = await this.getTeamMembersWithNames(orgId, managerId);
    const teamIds = teamMembers.map((m) => m.userId);

    if (teamIds.length === 0) {
      return { month, year, employees: [] };
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get approved leaves in the date range
    const leaveRequests = await this.db
      .select({
        employeeId: schema.leaveRequests.employeeId,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        status: schema.leaveRequests.status,
        isHalfDay: schema.leaveRequests.isHalfDay,
        leaveTypeName: schema.leaveTypes.name,
      })
      .from(schema.leaveRequests)
      .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamIds),
          lte(schema.leaveRequests.fromDate, endDate),
          gte(schema.leaveRequests.toDate, startDate),
          inArray(schema.leaveRequests.status, ['approved', 'pending']),
        ),
      );

    // Get holidays in the date range
    const holidays = await this.db
      .select({
        date: schema.holidayCalendars.date,
        name: schema.holidayCalendars.name,
        type: schema.holidayCalendars.type,
        isOptional: schema.holidayCalendars.isOptional,
      })
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          gte(schema.holidayCalendars.date, startDate),
          lte(schema.holidayCalendars.date, endDate),
        ),
      );

    const holidayDates = new Set(holidays.map((h) => h.date));

    // Build per-employee per-day availability
    const employees = teamMembers.map((member) => {
      const memberLeaves = leaveRequests.filter((lr) => lr.employeeId === member.userId);

      // Build a set of dates when employee is on leave
      const leaveDates = new Map<string, { status: string; leaveType: string; isHalfDay: boolean }>();
      for (const leave of memberLeaves) {
        const from = new Date(leave.fromDate);
        const to = new Date(leave.toDate);
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        const effectiveStart = from < rangeStart ? rangeStart : from;
        const effectiveEnd = to > rangeEnd ? rangeEnd : to;

        const current = new Date(effectiveStart);
        while (current <= effectiveEnd) {
          const dateStr = current.toISOString().split('T')[0];
          leaveDates.set(dateStr, {
            status: leave.status,
            leaveType: leave.leaveTypeName,
            isHalfDay: leave.isHalfDay,
          });
          current.setDate(current.getDate() + 1);
        }
      }

      // Generate per-day availability
      const days: any[] = [];
      const current = new Date(startDate);
      const rangeEnd = new Date(endDate);
      while (current <= rangeEnd) {
        const dateStr = current.toISOString().split('T')[0];
        const dayOfWeek = current.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidayDates.has(dateStr);
        const leaveInfo = leaveDates.get(dateStr);

        let availability = 'available';
        if (isWeekend) {
          availability = 'weekend';
        } else if (isHoliday) {
          availability = 'holiday';
        } else if (leaveInfo) {
          availability = leaveInfo.isHalfDay ? 'half_day_leave' : (leaveInfo.status === 'pending' ? 'pending_leave' : 'on_leave');
        }

        days.push({
          date: dateStr,
          availability,
          leaveType: leaveInfo?.leaveType ?? null,
          isWeekend,
          isHoliday,
        });

        current.setDate(current.getDate() + 1);
      }

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        department: member.departmentName ?? 'Unassigned',
        days,
      };
    });

    return { month, year, startDate, endDate, holidays, employees };
  }

  async blockDates(orgId: string, managerId: string, body: Record<string, any>) {
    const { dates, reason } = body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      throw new BadRequestException('dates array is required');
    }
    if (!reason) {
      throw new BadRequestException('reason is required');
    }

    // Get or create the default leave policy to store blocked dates in metadata
    const [policy] = await this.db
      .select()
      .from(schema.leavePolicies)
      .where(
        and(
          eq(schema.leavePolicies.orgId, orgId),
          eq(schema.leavePolicies.isDefault, true),
          eq(schema.leavePolicies.isActive, true),
        ),
      );

    if (!policy) {
      throw new NotFoundException('No active leave policy found');
    }

    const metadata = (policy.metadata ?? {}) as Record<string, any>;
    const blockedDates = (metadata.blockedDates ?? []) as any[];

    const newEntry = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      dates,
      reason,
      blockedBy: managerId,
      createdAt: new Date().toISOString(),
    };

    blockedDates.push(newEntry);
    metadata.blockedDates = blockedDates;

    await this.db
      .update(schema.leavePolicies)
      .set({
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(schema.leavePolicies.id, policy.id));

    return {
      id: newEntry.id,
      dates,
      reason,
      createdAt: newEntry.createdAt,
    };
  }

  async getBlockedDates(orgId: string, managerId: string) {
    const [policy] = await this.db
      .select()
      .from(schema.leavePolicies)
      .where(
        and(
          eq(schema.leavePolicies.orgId, orgId),
          eq(schema.leavePolicies.isDefault, true),
          eq(schema.leavePolicies.isActive, true),
        ),
      );

    if (!policy) {
      return { blockedDates: [] };
    }

    const metadata = (policy.metadata ?? {}) as Record<string, any>;
    const blockedDates = (metadata.blockedDates ?? []) as any[];

    // Filter to only show blocked dates created by this manager
    const managerBlocked = blockedDates.filter((bd: any) => bd.blockedBy === managerId);

    return { blockedDates: managerBlocked };
  }

  async removeBlockedDate(orgId: string, managerId: string, blockId: string) {
    const [policy] = await this.db
      .select()
      .from(schema.leavePolicies)
      .where(
        and(
          eq(schema.leavePolicies.orgId, orgId),
          eq(schema.leavePolicies.isDefault, true),
          eq(schema.leavePolicies.isActive, true),
        ),
      );

    if (!policy) {
      throw new NotFoundException('No active leave policy found');
    }

    const metadata = (policy.metadata ?? {}) as Record<string, any>;
    const blockedDates = (metadata.blockedDates ?? []) as any[];

    const index = blockedDates.findIndex(
      (bd: any) => bd.id === blockId && bd.blockedBy === managerId,
    );

    if (index === -1) {
      throw new NotFoundException('Blocked date entry not found');
    }

    blockedDates.splice(index, 1);
    metadata.blockedDates = blockedDates;

    await this.db
      .update(schema.leavePolicies)
      .set({
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(schema.leavePolicies.id, policy.id));

    return { removed: true, blockId };
  }

  async getRecommendations(orgId: string, managerId: string, month: number, year: number) {
    const teamMembers = await this.getTeamMembersWithNames(orgId, managerId);
    const teamIds = teamMembers.map((m) => m.userId);
    const totalTeam = teamIds.length;

    if (totalTeam === 0) {
      return { month, year, recommendations: [] };
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get approved leaves in the date range
    const leaveRequests = await this.db
      .select({
        employeeId: schema.leaveRequests.employeeId,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
      })
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamIds),
          lte(schema.leaveRequests.fromDate, endDate),
          gte(schema.leaveRequests.toDate, startDate),
          eq(schema.leaveRequests.status, 'approved'),
        ),
      );

    // Get holidays
    const holidays = await this.db
      .select({
        date: schema.holidayCalendars.date,
        name: schema.holidayCalendars.name,
      })
      .from(schema.holidayCalendars)
      .where(
        and(
          eq(schema.holidayCalendars.orgId, orgId),
          gte(schema.holidayCalendars.date, startDate),
          lte(schema.holidayCalendars.date, endDate),
        ),
      );

    const holidayDates = new Set(holidays.map((h) => h.date));

    // Get blocked dates
    const [policy] = await this.db
      .select()
      .from(schema.leavePolicies)
      .where(
        and(
          eq(schema.leavePolicies.orgId, orgId),
          eq(schema.leavePolicies.isDefault, true),
          eq(schema.leavePolicies.isActive, true),
        ),
      );

    const metadata = (policy?.metadata ?? {}) as Record<string, any>;
    const blockedEntries = (metadata.blockedDates ?? []) as any[];
    const blockedDateSet = new Set<string>();
    for (const entry of blockedEntries) {
      if (entry.blockedBy === managerId && Array.isArray(entry.dates)) {
        for (const d of entry.dates) {
          blockedDateSet.add(d);
        }
      }
    }

    // Count leaves per day
    const dayLeaveCount = new Map<string, number>();
    for (const leave of leaveRequests) {
      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);
      const effectiveStart = from < rangeStart ? rangeStart : from;
      const effectiveEnd = to > rangeEnd ? rangeEnd : to;

      const current = new Date(effectiveStart);
      while (current <= effectiveEnd) {
        const dateStr = current.toISOString().split('T')[0];
        dayLeaveCount.set(dateStr, (dayLeaveCount.get(dateStr) ?? 0) + 1);
        current.setDate(current.getDate() + 1);
      }
    }

    // Find recommended dates (working days with best coverage, not blocked)
    const recommendations: any[] = [];
    const current = new Date(startDate);
    const rangeEnd = new Date(endDate);

    while (current <= rangeEnd) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.has(dateStr);
      const isBlocked = blockedDateSet.has(dateStr);
      const onLeaveCount = dayLeaveCount.get(dateStr) ?? 0;

      if (!isWeekend && !isHoliday && !isBlocked) {
        const available = totalTeam - onLeaveCount;
        const coveragePercent = Math.round((available / totalTeam) * 100);

        recommendations.push({
          date: dateStr,
          dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
          onLeave: onLeaveCount,
          available,
          coveragePercent,
          isBlocked: false,
          // Adjacent to weekend/holiday = better for long weekends
          adjacentToHoliday: holidayDates.has(
            new Date(current.getTime() + 86400000).toISOString().split('T')[0],
          ) || holidayDates.has(
            new Date(current.getTime() - 86400000).toISOString().split('T')[0],
          ),
        });
      }

      current.setDate(current.getDate() + 1);
    }

    // Sort by coverage (highest first) — best dates to take leave are those with best remaining coverage
    recommendations.sort((a, b) => b.coveragePercent - a.coveragePercent);

    return {
      month,
      year,
      totalTeam,
      recommendations: recommendations.slice(0, 15), // Top 15 recommended dates
    };
  }
}
