import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamLeaveCalendarService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const team = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
    return team.map((t) => t.userId);
  }

  private async getTeamMembersWithNames(orgId: string, managerId: string) {
    return this.db
      .select({
        userId: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.users)
      .innerJoin(schema.employeeProfiles, eq(schema.users.id, schema.employeeProfiles.userId))
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
          eq(schema.users.isActive, true),
        ),
      );
  }

  async getMonthlyCalendar(orgId: string, managerId: string, month: number, year: number) {
    const teamMembers = await this.getTeamMembersWithNames(orgId, managerId);
    const teamIds = teamMembers.map((m) => m.userId);

    if (teamIds.length === 0) {
      return { month, year, employees: [] };
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const leaveRequests = await this.db
      .select({
        id: schema.leaveRequests.id,
        employeeId: schema.leaveRequests.employeeId,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        totalDays: schema.leaveRequests.totalDays,
        status: schema.leaveRequests.status,
        isHalfDay: schema.leaveRequests.isHalfDay,
        halfDayType: schema.leaveRequests.halfDayType,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeCode: schema.leaveTypes.code,
        leaveTypeColor: schema.leaveTypes.color,
        dayBreakdown: schema.leaveRequests.dayBreakdown,
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

    // Build per-employee per-day entries
    const employees = teamMembers.map((member) => {
      const memberLeaves = leaveRequests.filter((lr) => lr.employeeId === member.userId);
      const days: Record<string, any>[] = [];

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
          days.push({
            date: dateStr,
            leaveRequestId: leave.id,
            status: leave.status,
            leaveType: leave.leaveTypeName,
            leaveTypeCode: leave.leaveTypeCode,
            color: leave.leaveTypeColor,
            isHalfDay: leave.isHalfDay,
            halfDayType: leave.halfDayType,
          });
          current.setDate(current.getDate() + 1);
        }
      }

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        days,
      };
    });

    return { month, year, startDate, endDate, employees };
  }

  async getAvailability(orgId: string, managerId: string, startDate: string, endDate: string) {
    const teamMembers = await this.getTeamMembersWithNames(orgId, managerId);
    const teamIds = teamMembers.map((m) => m.userId);
    const totalEmployees = teamIds.length;

    if (totalEmployees === 0) {
      return { startDate, endDate, totalEmployees: 0, days: [] };
    }

    // Get approved and pending leaves in the date range
    const leaveRequests = await this.db
      .select({
        employeeId: schema.leaveRequests.employeeId,
        fromDate: schema.leaveRequests.fromDate,
        toDate: schema.leaveRequests.toDate,
        status: schema.leaveRequests.status,
        isHalfDay: schema.leaveRequests.isHalfDay,
      })
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamIds),
          lte(schema.leaveRequests.fromDate, endDate),
          gte(schema.leaveRequests.toDate, startDate),
          inArray(schema.leaveRequests.status, ['approved', 'pending']),
        ),
      );

    // Build per-day heatmap
    const dayMap = new Map<string, { onLeave: Set<string>; pending: Set<string> }>();
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Initialize all days
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      dayMap.set(dateStr, { onLeave: new Set(), pending: new Set() });
      current.setDate(current.getDate() + 1);
    }

    // Populate from leave requests
    for (const leave of leaveRequests) {
      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);
      const effectiveStart = from < start ? start : from;
      const effectiveEnd = to > end ? end : to;

      const cur = new Date(effectiveStart);
      while (cur <= effectiveEnd) {
        const dateStr = cur.toISOString().split('T')[0];
        const day = dayMap.get(dateStr);
        if (day) {
          if (leave.status === 'approved') {
            day.onLeave.add(leave.employeeId);
          } else if (leave.status === 'pending') {
            day.pending.add(leave.employeeId);
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    const days = Array.from(dayMap.entries()).map(([date, data]) => ({
      date,
      totalEmployees,
      onLeave: data.onLeave.size,
      pending: data.pending.size,
      available: totalEmployees - data.onLeave.size,
      availabilityPercent: Math.round(((totalEmployees - data.onLeave.size) / totalEmployees) * 100),
    }));

    return { startDate, endDate, totalEmployees, days };
  }

  async getStaffingCheck(
    orgId: string,
    managerId: string,
    startDate: string,
    endDate: string,
    threshold: number,
  ) {
    const availability = await this.getAvailability(orgId, managerId, startDate, endDate);
    const minAvailabilityPercent = threshold;

    const alerts = availability.days
      .filter((day) => day.availabilityPercent < minAvailabilityPercent)
      .map((day) => ({
        date: day.date,
        totalEmployees: day.totalEmployees,
        available: day.available,
        onLeave: day.onLeave,
        pending: day.pending,
        availabilityPercent: day.availabilityPercent,
        belowThreshold: true,
      }));

    return {
      startDate,
      endDate,
      threshold: minAvailabilityPercent,
      totalAlerts: alerts.length,
      alerts,
    };
  }

  async quickAction(orgId: string, managerId: string, body: Record<string, any>) {
    const { requestId, action, comment } = body;

    if (!requestId || !action) {
      throw new BadRequestException('requestId and action are required');
    }
    if (!['approve', 'reject'].includes(action)) {
      throw new BadRequestException('action must be approve or reject');
    }

    // Verify the request belongs to manager's team
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    const [request] = await this.db
      .select()
      .from(schema.leaveRequests)
      .where(
        and(
          eq(schema.leaveRequests.id, requestId),
          eq(schema.leaveRequests.orgId, orgId),
          inArray(schema.leaveRequests.employeeId, teamIds),
          eq(schema.leaveRequests.status, 'pending'),
        ),
      );

    if (!request) {
      throw new NotFoundException('Leave request not found or not in pending status');
    }

    const now = new Date();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update leave request
    await this.db
      .update(schema.leaveRequests)
      .set({
        status: newStatus,
        approvedBy: managerId,
        approvedAt: now,
        approverComment: comment ?? null,
        updatedAt: now,
      })
      .where(eq(schema.leaveRequests.id, requestId));

    // Update leave balances
    if (action === 'approve') {
      // Move from pending to used
      await this.db
        .update(schema.leaveBalances)
        .set({
          pending: sql`${schema.leaveBalances.pending}::numeric - ${Number(request.totalDays)}`,
          used: sql`${schema.leaveBalances.used}::numeric + ${Number(request.totalDays)}`,
          available: sql`${schema.leaveBalances.available}::numeric - ${Number(request.totalDays)}`,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.leaveBalances.orgId, orgId),
            eq(schema.leaveBalances.employeeId, request.employeeId),
            eq(schema.leaveBalances.leaveTypeId, request.leaveTypeId),
            eq(schema.leaveBalances.year, String(new Date(request.fromDate).getFullYear())),
          ),
        );
    } else {
      // Rejected — restore pending back to available
      await this.db
        .update(schema.leaveBalances)
        .set({
          pending: sql`${schema.leaveBalances.pending}::numeric - ${Number(request.totalDays)}`,
          available: sql`${schema.leaveBalances.available}::numeric + ${Number(request.totalDays)}`,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.leaveBalances.orgId, orgId),
            eq(schema.leaveBalances.employeeId, request.employeeId),
            eq(schema.leaveBalances.leaveTypeId, request.leaveTypeId),
            eq(schema.leaveBalances.year, String(new Date(request.fromDate).getFullYear())),
          ),
        );
    }

    return {
      requestId,
      action,
      status: newStatus,
      updatedAt: now.toISOString(),
    };
  }
}
