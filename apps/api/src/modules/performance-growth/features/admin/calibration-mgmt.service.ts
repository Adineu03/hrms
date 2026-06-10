import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { buildUserNameMap } from '../../../../shared/database/user-names.util';

/** Standard bell-curve targets shown next to actuals in the distribution view. */
const TARGET_PERCENTS: Record<number, number> = { 1: 5, 2: 10, 3: 50, 4: 25, 5: 10 };

@Injectable()
export class CalibrationMgmtService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listCalibrationGroups(orgId: string, cycleId?: string) {
    const conditions: any[] = [eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.isActive, true)];
    if (cycleId) conditions.push(eq(schema.reviewAssignments.cycleId, cycleId));
    const assignments = await this.db.select({ assignment: schema.reviewAssignments, employee: schema.users, profile: schema.employeeProfiles })
      .from(schema.reviewAssignments)
      .innerJoin(schema.users, eq(schema.reviewAssignments.employeeId, schema.users.id))
      .leftJoin(schema.employeeProfiles, eq(schema.reviewAssignments.employeeId, schema.employeeProfiles.userId))
      .where(and(...conditions));
    const groups: Record<string, typeof assignments> = {};
    for (const r of assignments) {
      const groupId = r.assignment.calibrationGroupId ?? r.profile?.departmentId ?? 'default';
      if (!groups[groupId]) groups[groupId] = [];
      groups[groupId].push(r);
    }
    const departments = await this.db.select().from(schema.departments).where(eq(schema.departments.orgId, orgId));
    const designations = await this.db.select().from(schema.designations).where(eq(schema.designations.orgId, orgId));
    const deptNames: Record<string, string> = {};
    for (const d of departments) deptNames[d.id] = d.name;
    const desigNames: Record<string, string> = {};
    for (const d of designations) desigNames[d.id] = d.name;

    return Object.entries(groups).map(([id, members]) => {
      const employees = members.map((m) => ({
        id: m.assignment.id, // assignment id — the calibration PATCH expects it
        employeeId: m.assignment.employeeId,
        employeeName: `${m.employee.firstName} ${m.employee.lastName ?? ''}`.trim(),
        designation: desigNames[m.profile?.designationId ?? ''] ?? '--',
        selfRating: m.assignment.selfRating,
        managerRating: m.assignment.managerRating,
        preCalibrated: m.assignment.preCalibratedRating ?? m.assignment.managerRating ?? m.assignment.selfRating,
        calibrated: m.assignment.calibratedRating,
        status: m.assignment.status,
      }));
      const distribution = [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: employees.filter((e) => {
          const effective = e.calibrated ?? e.managerRating ?? e.selfRating;
          return effective != null && Math.min(5, Math.max(1, Math.round(Number(effective) || 0))) === rating;
        }).length,
        targetPercent: TARGET_PERCENTS[rating],
      }));
      const calibratedCount = employees.filter((e) => e.calibrated != null).length;
      const status = calibratedCount === 0 ? 'pending' : calibratedCount === employees.length ? 'completed' : 'in_progress';
      const name = deptNames[id] ?? 'Unassigned';
      return { id, groupId: id, name, groupName: name, type: 'department', status, totalEmployees: employees.length, memberCount: employees.length, employees, distribution };
    });
  }

  async getCalibrationGroup(orgId: string, groupId: string, cycleId?: string) {
    const conditions: any[] = [eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.isActive, true)];
    if (cycleId) conditions.push(eq(schema.reviewAssignments.cycleId, cycleId));
    const assignments = await this.db.select({ assignment: schema.reviewAssignments, employee: schema.users, profile: schema.employeeProfiles })
      .from(schema.reviewAssignments)
      .innerJoin(schema.users, eq(schema.reviewAssignments.employeeId, schema.users.id))
      .leftJoin(schema.employeeProfiles, eq(schema.reviewAssignments.employeeId, schema.employeeProfiles.userId))
      .where(and(...conditions));
    const members = assignments.filter(a => (a.assignment.calibrationGroupId ?? a.profile?.departmentId ?? 'default') === groupId);
    return { groupId, members: members.map(m => ({ assignmentId: m.assignment.id, employeeId: m.assignment.employeeId, employeeName: `${m.employee.firstName} ${m.employee.lastName}`, managerRating: m.assignment.managerRating, preCalibratedRating: m.assignment.preCalibratedRating, calibratedRating: m.assignment.calibratedRating, calibrationNotes: m.assignment.calibrationNotes, status: m.assignment.status })) };
  }

  async updateCalibrationRatings(orgId: string, userId: string, updates: { assignmentId: string; calibratedRating: number; notes?: string }[]) {
    let updated = 0;
    for (const u of updates) {
      const [row] = await this.db.select({ assignment: schema.reviewAssignments, employee: schema.users })
        .from(schema.reviewAssignments)
        .innerJoin(schema.users, eq(schema.reviewAssignments.employeeId, schema.users.id))
        .where(and(eq(schema.reviewAssignments.id, u.assignmentId), eq(schema.reviewAssignments.orgId, orgId))).limit(1);
      if (!row) continue;
      const existing = row.assignment;
      const previous = existing.calibratedRating ?? existing.managerRating ?? existing.finalRating;
      await this.db.update(schema.reviewAssignments).set({
        preCalibratedRating: previous,
        calibratedRating: u.calibratedRating.toString(), calibrationNotes: u.notes ?? existing.calibrationNotes,
        updatedAt: new Date(),
      }).where(and(eq(schema.reviewAssignments.id, u.assignmentId), eq(schema.reviewAssignments.orgId, orgId)));
      // Record the change so the calibration audit trail shows real entries.
      const employeeName = `${row.employee.firstName} ${row.employee.lastName ?? ''}`.trim();
      const prevNum = previous != null ? Number(previous) : null;
      await this.db.insert(schema.auditLogs).values({
        orgId, userId, action: 'update', entity: 'review_assignment', entityId: u.assignmentId,
        oldValue: { rating: prevNum },
        newValue: { rating: u.calibratedRating, employeeName },
        description: `Calibration: ${employeeName} rating changed ${prevNum ?? '--'} → ${u.calibratedRating}${u.notes ? ` — ${u.notes}` : ''}`,
      });
      updated++;
    }
    return { success: true, updated };
  }

  async getCalibrationAuditTrail(orgId: string, _cycleId?: string) {
    // Calibration changes are recorded in audit_logs (entity 'review_assignment', action 'update')
    // with { rating, employeeName } snapshots in oldValue/newValue.
    const rows = await this.db.select().from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.orgId, orgId), eq(schema.auditLogs.entity, 'review_assignment'), eq(schema.auditLogs.action, 'update')))
      .orderBy(desc(schema.auditLogs.createdAt)).limit(50);
    const nameMap = await buildUserNameMap(this.db, rows.map((r) => r.userId));
    return rows.map((r) => {
      const oldV = (r.oldValue ?? {}) as Record<string, any>;
      const newV = (r.newValue ?? {}) as Record<string, any>;
      return {
        id: r.id,
        employeeName: newV.employeeName ?? oldV.employeeName ?? 'Employee',
        previousRating: Number(oldV.rating) || 0,
        newRating: Number(newV.rating) || 0,
        changedBy: nameMap.get(r.userId) ?? 'System',
        reason: r.description ?? '',
        changedAt: r.createdAt,
      };
    });
  }

  async getForceDistribution(orgId: string, cycleId?: string) {
    const conditions: any[] = [eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.isActive, true)];
    if (cycleId) conditions.push(eq(schema.reviewAssignments.cycleId, cycleId));
    const rows = await this.db.select().from(schema.reviewAssignments).where(and(...conditions));
    const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const r of rows) {
      const rating = r.calibratedRating ?? r.managerRating;
      if (rating) { const b = Math.min(5, Math.max(1, Math.round(Number(rating)))).toString(); dist[b]++; }
    }
    return { distribution: dist, total: rows.length, labels: { '1': 'Needs Improvement', '2': 'Below Expectations', '3': 'Meets Expectations', '4': 'Exceeds Expectations', '5': 'Outstanding' } };
  }
}
