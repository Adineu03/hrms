import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, sql, gte, lte, asc, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { shifts } from '../../../../infrastructure/database/schema/shifts';
import { employeeShiftAssignments } from '../../../../infrastructure/database/schema/employee-shift-assignments';
import { shiftSwapRequests } from '../../../../infrastructure/database/schema/shift-swap-requests';

@Injectable()
export class ShiftPlanningService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private toSwapRequestDto(row: Record<string, any>) {
    return {
      id: row.id,
      requesterId: row.requesterId,
      requesterName: row.requesterName,
      targetEmployeeId: row.targetEmployeeId,
      targetEmployeeName: row.targetEmployeeName,
      requesterShiftId: row.requesterShiftId,
      requesterShiftName: row.requesterShiftName,
      targetShiftId: row.targetShiftId,
      targetShiftName: row.targetShiftName,
      swapDate: row.swapDate,
      reason: row.reason,
      status: row.status,
      partnerAcceptedAt: row.partnerAcceptedAt,
      managerComment: row.managerComment,
      createdAt: row.createdAt,
    };
  }

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const members = await this.db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(
        and(
          eq(employeeProfiles.managerId, managerId),
          eq(users.orgId, orgId),
          eq(users.isActive, true),
        ),
      );
    return members.map((m) => m.userId);
  }

  async getRoster(orgId: string, managerId: string, weekStart: string) {
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    const weekEnd = weekEndDate.toISOString().split('T')[0];

    // Get team members with names
    const teamMembers = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(
        and(
          eq(employeeProfiles.managerId, managerId),
          eq(users.orgId, orgId),
          eq(users.isActive, true),
        ),
      );

    if (teamMembers.length === 0) {
      return { weekStart, weekEnd, roster: [] };
    }

    // Get shift assignments for the week
    const assignments = await this.db
      .select({
        employeeId: employeeShiftAssignments.employeeId,
        shiftId: employeeShiftAssignments.shiftId,
        effectiveFrom: employeeShiftAssignments.effectiveFrom,
        effectiveTo: employeeShiftAssignments.effectiveTo,
        shiftName: shifts.name,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        metadata: employeeShiftAssignments.metadata,
      })
      .from(employeeShiftAssignments)
      .innerJoin(shifts, eq(employeeShiftAssignments.shiftId, shifts.id))
      .where(
        and(
          eq(employeeShiftAssignments.orgId, orgId),
          eq(employeeShiftAssignments.isCurrent, true),
          lte(employeeShiftAssignments.effectiveFrom, weekEnd),
        ),
      )
      .orderBy(asc(employeeShiftAssignments.effectiveFrom));

    const teamUserIds = new Set(teamMembers.map((m) => m.userId));

    // Filter assignments to team members
    const teamAssignments = assignments.filter((a) => teamUserIds.has(a.employeeId));

    // Build roster: for each employee, list their assignments for each day of the week
    const roster = teamMembers.map((member) => {
      const memberAssignments = teamAssignments.filter((a) => a.employeeId === member.userId);

      const dailyAssignments: Array<{
        date: string;
        shiftId: string;
        shiftName: string;
        startTime: string;
        endTime: string;
      }> = [];

      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStartDate);
        day.setDate(weekStartDate.getDate() + i);
        const dayStr = day.toISOString().split('T')[0];

        // Find applicable assignment for this day
        const applicable = memberAssignments.find((a) => {
          const from = a.effectiveFrom;
          const to = a.effectiveTo;
          return from <= dayStr && (!to || to >= dayStr);
        });

        if (applicable) {
          dailyAssignments.push({
            date: dayStr,
            shiftId: applicable.shiftId,
            shiftName: applicable.shiftName,
            startTime: applicable.startTime,
            endTime: applicable.endTime,
          });
        }
      }

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        assignments: dailyAssignments,
      };
    });

    return { weekStart, weekEnd, roster };
  }

  async assignShift(
    orgId: string,
    managerId: string,
    body: {
      employeeIds: string[];
      shiftId: string;
      effectiveFrom: string;
      effectiveTo?: string;
    },
  ) {
    const { employeeIds, shiftId, effectiveFrom, effectiveTo } = body;

    if (!employeeIds || employeeIds.length === 0) {
      throw new BadRequestException('At least one employeeId is required');
    }
    if (!shiftId) {
      throw new BadRequestException('shiftId is required');
    }
    if (!effectiveFrom) {
      throw new BadRequestException('effectiveFrom is required');
    }

    // Verify shift exists and belongs to org
    const [shift] = await this.db
      .select({ id: shifts.id })
      .from(shifts)
      .where(and(eq(shifts.id, shiftId), eq(shifts.orgId, orgId)))
      .limit(1);

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Verify employees are in manager's team
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    const invalidIds = employeeIds.filter((id) => !teamMemberIds.includes(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Employees not in your team: ${invalidIds.join(', ')}`,
      );
    }

    // Mark previous current assignments as not current for overlapping dates
    for (const empId of employeeIds) {
      await this.db
        .update(employeeShiftAssignments)
        .set({ isCurrent: false, updatedAt: new Date() })
        .where(
          and(
            eq(employeeShiftAssignments.orgId, orgId),
            eq(employeeShiftAssignments.employeeId, empId),
            eq(employeeShiftAssignments.isCurrent, true),
          ),
        );
    }

    // Create new assignments
    const newAssignments = employeeIds.map((empId) => ({
      orgId,
      employeeId: empId,
      shiftId,
      effectiveFrom,
      effectiveTo: effectiveTo ?? null,
      assignedBy: managerId,
      isCurrent: true,
      metadata: {},
    }));

    const inserted = await this.db
      .insert(employeeShiftAssignments)
      .values(newAssignments)
      .returning();

    return {
      message: `Shift assigned to ${employeeIds.length} employee(s)`,
      assignments: inserted.length,
    };
  }

  async getSwapRequests(orgId: string, managerId: string) {
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamMemberIds.length === 0) {
      return { data: [] };
    }

    // Alias users for requester and target
    const rows = await this.db
      .select({
        id: shiftSwapRequests.id,
        requesterId: shiftSwapRequests.requesterId,
        targetEmployeeId: shiftSwapRequests.targetEmployeeId,
        requesterShiftId: shiftSwapRequests.requesterShiftId,
        targetShiftId: shiftSwapRequests.targetShiftId,
        swapDate: shiftSwapRequests.swapDate,
        reason: shiftSwapRequests.reason,
        status: shiftSwapRequests.status,
        partnerAcceptedAt: shiftSwapRequests.partnerAcceptedAt,
        managerComment: shiftSwapRequests.managerComment,
        createdAt: shiftSwapRequests.createdAt,
      })
      .from(shiftSwapRequests)
      .where(eq(shiftSwapRequests.orgId, orgId))
      .orderBy(asc(shiftSwapRequests.createdAt));

    // Filter to requests involving team members
    const teamSet = new Set(teamMemberIds);
    const teamSwapRequests = rows.filter(
      (r) => teamSet.has(r.requesterId) || teamSet.has(r.targetEmployeeId),
    );

    // Enrich with names
    const allUserIds = new Set<string>();
    for (const r of teamSwapRequests) {
      allUserIds.add(r.requesterId);
      allUserIds.add(r.targetEmployeeId);
    }
    const allShiftIds = new Set<string>();
    for (const r of teamSwapRequests) {
      allShiftIds.add(r.requesterShiftId);
      allShiftIds.add(r.targetShiftId);
    }

    // Fetch user names
    const userNames = new Map<string, string>();
    if (allUserIds.size > 0) {
      const userRows = await this.db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(inArray(users.id, Array.from(allUserIds)));
      for (const u of userRows) {
        userNames.set(u.id, `${u.firstName} ${u.lastName ?? ''}`.trim());
      }
    }

    // Fetch shift names
    const shiftNames = new Map<string, string>();
    if (allShiftIds.size > 0) {
      const shiftRows = await this.db
        .select({ id: shifts.id, name: shifts.name })
        .from(shifts)
        .where(inArray(shifts.id, Array.from(allShiftIds)));
      for (const s of shiftRows) {
        shiftNames.set(s.id, s.name);
      }
    }

    const data = teamSwapRequests.map((r) =>
      this.toSwapRequestDto({
        ...r,
        requesterName: userNames.get(r.requesterId) ?? 'Unknown',
        targetEmployeeName: userNames.get(r.targetEmployeeId) ?? 'Unknown',
        requesterShiftName: shiftNames.get(r.requesterShiftId) ?? 'Unknown',
        targetShiftName: shiftNames.get(r.targetShiftId) ?? 'Unknown',
      }),
    );

    return { data };
  }

  async handleSwapRequest(
    orgId: string,
    managerId: string,
    requestId: string,
    body: { action: string; comment?: string },
  ) {
    const { action, comment } = body;

    if (!['approve', 'reject'].includes(action)) {
      throw new BadRequestException('Action must be "approve" or "reject"');
    }

    const [request] = await this.db
      .select()
      .from(shiftSwapRequests)
      .where(
        and(
          eq(shiftSwapRequests.id, requestId),
          eq(shiftSwapRequests.orgId, orgId),
        ),
      )
      .limit(1);

    if (!request) {
      throw new NotFoundException('Swap request not found');
    }

    // Verify the request involves a team member
    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    const teamSet = new Set(teamMemberIds);
    if (!teamSet.has(request.requesterId) && !teamSet.has(request.targetEmployeeId)) {
      throw new BadRequestException('Swap request does not involve your team members');
    }

    const newStatus = action === 'approve' ? 'manager_approved' : 'rejected';

    await this.db
      .update(shiftSwapRequests)
      .set({
        status: newStatus,
        managerApprovedBy: managerId,
        managerApprovedAt: new Date(),
        managerComment: comment ?? null,
        updatedAt: new Date(),
      })
      .where(eq(shiftSwapRequests.id, requestId));

    // If approved, actually swap the shift assignments
    if (action === 'approve') {
      // Update requester's assignment to target's shift
      await this.db
        .update(employeeShiftAssignments)
        .set({
          shiftId: request.targetShiftId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(employeeShiftAssignments.orgId, orgId),
            eq(employeeShiftAssignments.employeeId, request.requesterId),
            eq(employeeShiftAssignments.shiftId, request.requesterShiftId),
            eq(employeeShiftAssignments.isCurrent, true),
          ),
        );

      // Update target's assignment to requester's shift
      await this.db
        .update(employeeShiftAssignments)
        .set({
          shiftId: request.requesterShiftId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(employeeShiftAssignments.orgId, orgId),
            eq(employeeShiftAssignments.employeeId, request.targetEmployeeId),
            eq(employeeShiftAssignments.shiftId, request.targetShiftId),
            eq(employeeShiftAssignments.isCurrent, true),
          ),
        );
    }

    return {
      message: `Swap request ${action === 'approve' ? 'approved' : 'rejected'}`,
      id: requestId,
      status: newStatus,
    };
  }

  async getShiftCoverage(orgId: string, managerId: string, date: string) {
    const coverageDate = date || new Date().toISOString().split('T')[0];

    // Get all active shifts for the org
    const orgShifts = await this.db
      .select({
        id: shifts.id,
        name: shifts.name,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
      })
      .from(shifts)
      .where(and(eq(shifts.orgId, orgId), eq(shifts.isActive, true)));

    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamMemberIds.length === 0) {
      return {
        date: coverageDate,
        coverage: orgShifts.map((s) => ({
          shiftId: s.id,
          shiftName: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          required: 0,
          assigned: 0,
          gap: 0,
        })),
      };
    }

    // Get current assignments for team members on the given date
    const assignments = await this.db
      .select({
        shiftId: employeeShiftAssignments.shiftId,
        employeeId: employeeShiftAssignments.employeeId,
      })
      .from(employeeShiftAssignments)
      .where(
        and(
          eq(employeeShiftAssignments.orgId, orgId),
          eq(employeeShiftAssignments.isCurrent, true),
          lte(employeeShiftAssignments.effectiveFrom, coverageDate),
        ),
      );

    // Filter to team members
    const teamSet = new Set(teamMemberIds);
    const teamAssignments = assignments.filter((a) => teamSet.has(a.employeeId));

    // Count assigned per shift
    const assignedCountByShift = new Map<string, number>();
    for (const a of teamAssignments) {
      assignedCountByShift.set(a.shiftId, (assignedCountByShift.get(a.shiftId) ?? 0) + 1);
    }

    // For required count, use team size distributed evenly (can be refined later with shift requirements config)
    const totalTeamSize = teamMemberIds.length;
    const shiftsCount = orgShifts.length || 1;
    const requiredPerShift = Math.ceil(totalTeamSize / shiftsCount);

    const coverage = orgShifts.map((s) => {
      const assigned = assignedCountByShift.get(s.id) ?? 0;
      return {
        shiftId: s.id,
        shiftName: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        required: requiredPerShift,
        assigned,
        gap: Math.max(0, requiredPerShift - assigned),
      };
    });

    return { date: coverageDate, coverage };
  }

  async publishSchedule(orgId: string, managerId: string, body: { weekStart: string }) {
    const { weekStart } = body;
    if (!weekStart) {
      throw new BadRequestException('weekStart is required');
    }

    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEnd = weekEndDate.toISOString().split('T')[0];

    const teamMemberIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamMemberIds.length === 0) {
      return { message: 'No team members to publish schedule for', published: 0 };
    }

    // Get assignments for the week for team members
    const assignments = await this.db
      .select({
        id: employeeShiftAssignments.id,
        employeeId: employeeShiftAssignments.employeeId,
        metadata: employeeShiftAssignments.metadata,
      })
      .from(employeeShiftAssignments)
      .where(
        and(
          eq(employeeShiftAssignments.orgId, orgId),
          eq(employeeShiftAssignments.isCurrent, true),
          lte(employeeShiftAssignments.effectiveFrom, weekEnd),
        ),
      );

    const teamSet = new Set(teamMemberIds);
    const teamAssignments = assignments.filter((a) => teamSet.has(a.employeeId));

    // Mark each assignment as published
    let publishedCount = 0;
    for (const assignment of teamAssignments) {
      const currentMetadata = (assignment.metadata as Record<string, any>) ?? {};
      await this.db
        .update(employeeShiftAssignments)
        .set({
          metadata: { ...currentMetadata, published: true, publishedAt: new Date().toISOString(), publishedBy: managerId },
          updatedAt: new Date(),
        })
        .where(eq(employeeShiftAssignments.id, assignment.id));
      publishedCount++;
    }

    return {
      message: `Schedule published for week starting ${weekStart}`,
      published: publishedCount,
      weekStart,
      weekEnd,
    };
  }
}
