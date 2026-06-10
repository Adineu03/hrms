import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, or, desc, asc, gte, lte, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { buildUserNameMap } from '../../../../shared/database/user-names.util';

@Injectable()
export class ShiftViewService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Current Shift ─────────────────────────────────────────────────────
  async getCurrentShift(orgId: string, userId: string) {
    // Find the current assignment
    const [assignment] = await this.db
      .select()
      .from(schema.employeeShiftAssignments)
      .where(
        and(
          eq(schema.employeeShiftAssignments.orgId, orgId),
          eq(schema.employeeShiftAssignments.employeeId, userId),
          eq(schema.employeeShiftAssignments.isCurrent, true),
        ),
      )
      .limit(1);

    if (!assignment) {
      // Try org default shift
      const [defaultShift] = await this.db
        .select()
        .from(schema.shifts)
        .where(
          and(
            eq(schema.shifts.orgId, orgId),
            eq(schema.shifts.isDefault, true),
            eq(schema.shifts.isActive, true),
          ),
        )
        .limit(1);

      if (!defaultShift) {
        throw new NotFoundException('No shift assigned and no default shift configured');
      }

      return this.toShiftDto(defaultShift, null);
    }

    const [shift] = await this.db
      .select()
      .from(schema.shifts)
      .where(
        and(
          eq(schema.shifts.id, assignment.shiftId),
          eq(schema.shifts.orgId, orgId),
        ),
      )
      .limit(1);

    if (!shift) {
      throw new NotFoundException('Assigned shift not found');
    }

    return this.toShiftDto(shift, assignment);
  }

  // ── Schedule ──────────────────────────────────────────────────────────
  async getSchedule(orgId: string, userId: string, view: string, dateStr: string) {
    const baseDate = dateStr ? new Date(dateStr) : new Date();
    let startDate: string;
    let endDate: string;

    if (view === 'week') {
      const dayOfWeek = baseDate.getDay();
      const weekStart = new Date(baseDate);
      weekStart.setDate(baseDate.getDate() - dayOfWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      startDate = weekStart.toISOString().slice(0, 10);
      endDate = weekEnd.toISOString().slice(0, 10);
    } else {
      // month view
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth() + 1;
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    // Get all assignments for this period
    const assignments = await this.db
      .select()
      .from(schema.employeeShiftAssignments)
      .where(
        and(
          eq(schema.employeeShiftAssignments.orgId, orgId),
          eq(schema.employeeShiftAssignments.employeeId, userId),
        ),
      )
      .orderBy(asc(schema.employeeShiftAssignments.effectiveFrom));

    // Get all shifts for the org
    const shiftRows = await this.db
      .select()
      .from(schema.shifts)
      .where(
        and(
          eq(schema.shifts.orgId, orgId),
          eq(schema.shifts.isActive, true),
        ),
      );

    const shiftMap = new Map(shiftRows.map((s) => [s.id, s]));

    // Get the current assignment to identify "current shift"
    const currentAssignment = assignments.find((a) => a.isCurrent);

    // Build schedule for each day in the range
    const schedule: Record<string, any>[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr2 = d.toISOString().slice(0, 10);

      // Find which assignment covers this date
      let activeAssignment = assignments.find((a) => {
        const from = a.effectiveFrom;
        const to = a.effectiveTo;
        return dateStr2 >= from && (!to || dateStr2 <= to);
      });

      // If no specific assignment and there's a current one, use it
      if (!activeAssignment && currentAssignment) {
        activeAssignment = currentAssignment;
      }

      const shift = activeAssignment ? shiftMap.get(activeAssignment.shiftId) : null;

      schedule.push({
        date: dateStr2,
        shiftId: shift?.id || null,
        shiftName: shift?.name || 'No shift assigned',
        startTime: shift?.startTime || null,
        endTime: shift?.endTime || null,
        breakConfig: shift?.breakConfig || [],
        isCurrentShift: activeAssignment?.isCurrent || false,
        isNightShift: shift?.isNightShift || false,
        isFlexible: shift?.isFlexible || false,
      });
    }

    return { view, startDate, endDate, schedule };
  }

  // ── History ───────────────────────────────────────────────────────────
  async getHistory(orgId: string, userId: string, limit: number) {
    const assignments = await this.db
      .select()
      .from(schema.employeeShiftAssignments)
      .where(
        and(
          eq(schema.employeeShiftAssignments.orgId, orgId),
          eq(schema.employeeShiftAssignments.employeeId, userId),
        ),
      )
      .orderBy(desc(schema.employeeShiftAssignments.effectiveFrom))
      .limit(limit);

    // Resolve shift names
    const shiftIds = [...new Set(assignments.map((a) => a.shiftId))];
    const shiftRows = shiftIds.length > 0
      ? await this.db
          .select()
          .from(schema.shifts)
          .where(eq(schema.shifts.orgId, orgId))
      : [];
    const shiftMap = new Map(shiftRows.map((s) => [s.id, s]));

    return {
      history: assignments.map((a) => {
        const shift = shiftMap.get(a.shiftId);
        return {
          id: a.id,
          shiftId: a.shiftId,
          shiftName: shift?.name || 'Unknown',
          shiftStartTime: shift?.startTime || null,
          shiftEndTime: shift?.endTime || null,
          effectiveFrom: a.effectiveFrom,
          effectiveTo: a.effectiveTo,
          isCurrent: a.isCurrent,
          assignedBy: a.assignedBy,
          createdAt: a.createdAt.toISOString(),
        };
      }),
    };
  }

  // ── Swap Request ──────────────────────────────────────────────────────
  async createSwapRequest(orgId: string, userId: string, data: Record<string, any>) {
    // Accept both the API payload (targetEmployeeId/targetShiftId/swapDate) and
    // the lightweight UI payload (targetEmployee name + date).
    const swapDate: string | undefined = data.swapDate || data.date;
    let targetEmployeeId: string | undefined = data.targetEmployeeId;

    if (!targetEmployeeId && data.targetEmployee) {
      const wanted = String(data.targetEmployee).trim().toLowerCase();
      const colleagues = await this.db
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
        })
        .from(schema.users)
        .where(and(eq(schema.users.orgId, orgId), eq(schema.users.isActive, true)));

      const fullName = (u: { firstName: string; lastName: string | null }) =>
        `${u.firstName} ${u.lastName ?? ''}`.trim().toLowerCase();
      const match =
        colleagues.find((u) => fullName(u) === wanted) ??
        colleagues.find((u) => u.id !== userId && fullName(u).includes(wanted));

      if (!match) {
        throw new NotFoundException(`No colleague found matching "${data.targetEmployee}"`);
      }
      targetEmployeeId = match.id;
    }

    if (targetEmployeeId === userId) {
      throw new BadRequestException('You cannot swap a shift with yourself');
    }

    let targetShiftId: string | undefined = data.targetShiftId;
    if (!targetShiftId && targetEmployeeId) {
      // Default to the colleague's current shift
      const [targetAssignment] = await this.db
        .select({ shiftId: schema.employeeShiftAssignments.shiftId })
        .from(schema.employeeShiftAssignments)
        .where(
          and(
            eq(schema.employeeShiftAssignments.orgId, orgId),
            eq(schema.employeeShiftAssignments.employeeId, targetEmployeeId),
            eq(schema.employeeShiftAssignments.isCurrent, true),
          ),
        )
        .limit(1);
      targetShiftId = targetAssignment?.shiftId;
    }

    if (!targetEmployeeId || !targetShiftId || !swapDate) {
      throw new BadRequestException('targetEmployeeId, targetShiftId, and swapDate are required');
    }
    data = { ...data, targetEmployeeId, targetShiftId, swapDate };

    // Get requester's current shift
    const [myAssignment] = await this.db
      .select()
      .from(schema.employeeShiftAssignments)
      .where(
        and(
          eq(schema.employeeShiftAssignments.orgId, orgId),
          eq(schema.employeeShiftAssignments.employeeId, userId),
          eq(schema.employeeShiftAssignments.isCurrent, true),
        ),
      )
      .limit(1);

    if (!myAssignment) {
      throw new BadRequestException('You do not have a shift assigned to swap');
    }

    // Verify target shift exists
    const [targetShift] = await this.db
      .select()
      .from(schema.shifts)
      .where(
        and(
          eq(schema.shifts.id, data.targetShiftId),
          eq(schema.shifts.orgId, orgId),
          eq(schema.shifts.isActive, true),
        ),
      )
      .limit(1);

    if (!targetShift) {
      throw new NotFoundException('Target shift not found');
    }

    // Check swap is enabled on the shift
    const [myShift] = await this.db
      .select()
      .from(schema.shifts)
      .where(eq(schema.shifts.id, myAssignment.shiftId))
      .limit(1);

    if (myShift && !myShift.swapEnabled) {
      throw new BadRequestException('Swap is not enabled for your current shift');
    }

    const [created] = await this.db
      .insert(schema.shiftSwapRequests)
      .values({
        orgId,
        requesterId: userId,
        targetEmployeeId: data.targetEmployeeId,
        requesterShiftId: myAssignment.shiftId,
        targetShiftId: data.targetShiftId,
        swapDate: data.swapDate,
        reason: data.reason || null,
        status: 'pending_partner',
      })
      .returning();

    return this.toSwapDto(created);
  }

  // ── List Swap Requests ────────────────────────────────────────────────
  async listSwapRequests(orgId: string, userId: string, status?: string) {
    // Include both directions: requests I raised AND requests targeting me
    const rows = await this.db
      .select()
      .from(schema.shiftSwapRequests)
      .where(
        and(
          eq(schema.shiftSwapRequests.orgId, orgId),
          or(
            eq(schema.shiftSwapRequests.requesterId, userId),
            eq(schema.shiftSwapRequests.targetEmployeeId, userId),
          ),
          ...(status ? [eq(schema.shiftSwapRequests.status, status)] : []),
        ),
      )
      .orderBy(desc(schema.shiftSwapRequests.createdAt));

    // Enrich with counterpart/user names and shift names
    const nameMap = await buildUserNameMap(
      this.db,
      rows.flatMap((r) => [r.requesterId, r.targetEmployeeId]),
    );

    const shiftIds = [
      ...new Set(rows.flatMap((r) => [r.requesterShiftId, r.targetShiftId])),
    ];
    const shiftNameMap = new Map<string, string>();
    if (shiftIds.length > 0) {
      const shiftRows = await this.db
        .select({ id: schema.shifts.id, name: schema.shifts.name })
        .from(schema.shifts)
        .where(inArray(schema.shifts.id, shiftIds));
      for (const s of shiftRows) shiftNameMap.set(s.id, s.name);
    }

    return {
      swapRequests: rows.map((r) => {
        const direction = r.requesterId === userId ? 'outgoing' : 'incoming';
        return {
          ...this.toSwapDto(r),
          date: r.swapDate,
          direction,
          requesterName: nameMap.get(r.requesterId) ?? 'Unknown',
          targetEmployeeName: nameMap.get(r.targetEmployeeId) ?? 'Unknown',
          counterpartName:
            direction === 'outgoing'
              ? nameMap.get(r.targetEmployeeId) ?? 'Unknown'
              : nameMap.get(r.requesterId) ?? 'Unknown',
          requesterShiftName: shiftNameMap.get(r.requesterShiftId) ?? 'Unknown',
          targetShiftName: shiftNameMap.get(r.targetShiftId) ?? 'Unknown',
        };
      }),
    };
  }

  // ── Get Swap Request Detail ───────────────────────────────────────────
  async getSwapRequest(orgId: string, userId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(schema.shiftSwapRequests)
      .where(
        and(
          eq(schema.shiftSwapRequests.id, id),
          eq(schema.shiftSwapRequests.orgId, orgId),
          eq(schema.shiftSwapRequests.requesterId, userId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Swap request not found');
    }

    // Resolve shift names
    const [requesterShift] = await this.db
      .select({ name: schema.shifts.name })
      .from(schema.shifts)
      .where(eq(schema.shifts.id, row.requesterShiftId))
      .limit(1);

    const [targetShift] = await this.db
      .select({ name: schema.shifts.name })
      .from(schema.shifts)
      .where(eq(schema.shifts.id, row.targetShiftId))
      .limit(1);

    // Resolve target employee name
    const [targetUser] = await this.db
      .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
      .from(schema.users)
      .where(eq(schema.users.id, row.targetEmployeeId))
      .limit(1);

    return {
      ...this.toSwapDto(row),
      requesterShiftName: requesterShift?.name || null,
      targetShiftName: targetShift?.name || null,
      targetEmployeeName: targetUser
        ? `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim()
        : null,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private toShiftDto(
    shift: typeof schema.shifts.$inferSelect,
    assignment: typeof schema.employeeShiftAssignments.$inferSelect | null,
  ) {
    return {
      shiftId: shift.id,
      name: shift.name,
      code: shift.code,
      type: shift.type,
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceMinutesLate: shift.graceMinutesLate,
      graceMinutesEarly: shift.graceMinutesEarly,
      isNightShift: shift.isNightShift,
      isFlexible: shift.isFlexible,
      flexCoreStart: shift.flexCoreStart,
      flexCoreEnd: shift.flexCoreEnd,
      minWorkHours: shift.minWorkHours,
      breakConfig: shift.breakConfig,
      swapEnabled: shift.swapEnabled,
      isDefault: shift.isDefault,
      assignmentId: assignment?.id || null,
      effectiveFrom: assignment?.effectiveFrom || null,
      effectiveTo: assignment?.effectiveTo || null,
      isCurrent: assignment?.isCurrent ?? shift.isDefault,
    };
  }

  private toSwapDto(row: typeof schema.shiftSwapRequests.$inferSelect) {
    return {
      id: row.id,
      orgId: row.orgId,
      requesterId: row.requesterId,
      targetEmployeeId: row.targetEmployeeId,
      requesterShiftId: row.requesterShiftId,
      targetShiftId: row.targetShiftId,
      swapDate: row.swapDate,
      reason: row.reason,
      status: row.status,
      partnerAcceptedAt: row.partnerAcceptedAt?.toISOString() || null,
      managerApprovedBy: row.managerApprovedBy,
      managerApprovedAt: row.managerApprovedAt?.toISOString() || null,
      managerComment: row.managerComment,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
