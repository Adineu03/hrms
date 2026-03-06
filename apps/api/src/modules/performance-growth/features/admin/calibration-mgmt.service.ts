import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CalibrationMgmtService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listCalibrationGroups(orgId: string, cycleId?: string) {
    const conditions: any[] = [eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.isActive, true)];
    if (cycleId) conditions.push(eq(schema.reviewAssignments.cycleId, cycleId));
    const assignments = await this.db.select({ assignment: schema.reviewAssignments, profile: schema.employeeProfiles })
      .from(schema.reviewAssignments)
      .leftJoin(schema.employeeProfiles, eq(schema.reviewAssignments.employeeId, schema.employeeProfiles.userId))
      .where(and(...conditions));
    const groups: Record<string, any[]> = {};
    for (const r of assignments) {
      const groupId = r.assignment.calibrationGroupId ?? r.profile?.departmentId ?? 'default';
      if (!groups[groupId]) groups[groupId] = [];
      groups[groupId].push(r);
    }
    const departments = await this.db.select().from(schema.departments).where(eq(schema.departments.orgId, orgId));
    const deptNames: Record<string, string> = {};
    for (const d of departments) deptNames[d.id] = d.name;
    return Object.entries(groups).map(([id, members]) => ({ groupId: id, groupName: deptNames[id] ?? id, memberCount: members.length }));
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

  async updateCalibrationRatings(orgId: string, updates: { assignmentId: string; calibratedRating: number; notes?: string }[]) {
    for (const u of updates) {
      const [existing] = await this.db.select().from(schema.reviewAssignments)
        .where(and(eq(schema.reviewAssignments.id, u.assignmentId), eq(schema.reviewAssignments.orgId, orgId))).limit(1);
      if (!existing) continue;
      await this.db.update(schema.reviewAssignments).set({
        preCalibratedRating: existing.calibratedRating ?? existing.managerRating ?? existing.finalRating,
        calibratedRating: u.calibratedRating.toString(), calibrationNotes: u.notes ?? existing.calibrationNotes,
        updatedAt: new Date(),
      }).where(and(eq(schema.reviewAssignments.id, u.assignmentId), eq(schema.reviewAssignments.orgId, orgId)));
    }
    return { success: true, updated: updates.length };
  }

  async getCalibrationAuditTrail(orgId: string, cycleId?: string) {
    const conditions: any[] = [eq(schema.reviewAssignments.orgId, orgId), eq(schema.reviewAssignments.isActive, true)];
    if (cycleId) conditions.push(eq(schema.reviewAssignments.cycleId, cycleId));
    const rows = await this.db.select({ assignment: schema.reviewAssignments, employee: schema.users })
      .from(schema.reviewAssignments)
      .innerJoin(schema.users, eq(schema.reviewAssignments.employeeId, schema.users.id))
      .where(and(...conditions));
    return rows.filter(r => r.assignment.preCalibratedRating !== null).map(r => ({
      assignmentId: r.assignment.id, employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      preCalibratedRating: r.assignment.preCalibratedRating, calibratedRating: r.assignment.calibratedRating,
      notes: r.assignment.calibrationNotes, updatedAt: r.assignment.updatedAt,
    }));
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
