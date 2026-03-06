import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, inArray, lt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LearningAssignmentsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  private async getTeamMemberIds(orgId: string, managerId: string): Promise<string[]> {
    const members = await this.db
      .select({ userId: schema.employeeProfiles.userId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.managerId, managerId),
        ),
      );
    return members.map((m) => m.userId);
  }

  async listAssignments(orgId: string, managerId: string, filters: { status?: string; courseId?: string }) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], meta: { total: 0 } };

    const conditions: any[] = [
      eq(schema.courseEnrollments.orgId, orgId),
      inArray(schema.courseEnrollments.employeeId, teamIds),
      eq(schema.courseEnrollments.assignmentType, 'manager'),
      eq(schema.courseEnrollments.isActive, true),
    ];
    if (filters.status) conditions.push(eq(schema.courseEnrollments.status, filters.status));
    if (filters.courseId) conditions.push(eq(schema.courseEnrollments.courseId, filters.courseId));

    const rows = await this.db
      .select({
        enrollment: schema.courseEnrollments,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.courseEnrollments)
      .innerJoin(schema.users, eq(schema.courseEnrollments.employeeId, schema.users.id))
      .where(and(...conditions))
      .orderBy(desc(schema.courseEnrollments.createdAt));

    // Enrich with course titles
    const courseIds = [...new Set(rows.map((r) => r.enrollment.courseId))];
    let courseMap: Record<string, string> = {};
    if (courseIds.length > 0) {
      const courses = await this.db
        .select({ id: schema.courses.id, title: schema.courses.title })
        .from(schema.courses)
        .where(inArray(schema.courses.id, courseIds));
      courseMap = Object.fromEntries(courses.map((c) => [c.id, c.title]));
    }

    return {
      data: rows.map((r) => ({
        ...r.enrollment,
        employeeName: `${r.firstName} ${r.lastName}`,
        employeeEmail: r.email,
        courseTitle: courseMap[r.enrollment.courseId] ?? 'Unknown',
      })),
      meta: { total: rows.length },
    };
  }

  async assignCourse(orgId: string, managerId: string, data: {
    courseId: string;
    employeeIds: string[];
    deadline?: string;
    notes?: string;
  }) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    const validEmployees = data.employeeIds.filter((id) => teamIds.includes(id));

    if (validEmployees.length === 0) {
      throw new NotFoundException('No valid team members found for assignment');
    }

    const created = [];
    for (const employeeId of validEmployees) {
      // Check if already enrolled
      const [existing] = await this.db
        .select()
        .from(schema.courseEnrollments)
        .where(
          and(
            eq(schema.courseEnrollments.orgId, orgId),
            eq(schema.courseEnrollments.courseId, data.courseId),
            eq(schema.courseEnrollments.employeeId, employeeId),
            eq(schema.courseEnrollments.isActive, true),
          ),
        )
        .limit(1);

      if (existing) continue;

      const [enrollment] = await this.db
        .insert(schema.courseEnrollments)
        .values({
          orgId,
          courseId: data.courseId,
          employeeId,
          assignedBy: managerId,
          assignmentType: 'manager',
          status: 'enrolled',
          deadline: data.deadline ? new Date(data.deadline) : null,
          notes: data.notes ?? null,
          metadata: { assignedByManager: true },
        })
        .returning();

      created.push(enrollment);
    }

    // Update course enrollment count
    if (created.length > 0) {
      const [course] = await this.db
        .select({ totalEnrollments: schema.courses.totalEnrollments })
        .from(schema.courses)
        .where(eq(schema.courses.id, data.courseId));

      if (course) {
        await this.db
          .update(schema.courses)
          .set({ totalEnrollments: (course.totalEnrollments ?? 0) + created.length, updatedAt: new Date() })
          .where(eq(schema.courses.id, data.courseId));
      }
    }

    return {
      success: true,
      message: `Course assigned to ${created.length} team member(s)`,
      assigned: created.length,
      skipped: validEmployees.length - created.length,
      data: created,
    };
  }

  async getOverdueAssignments(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) return { data: [], meta: { total: 0 } };

    const now = new Date();
    const rows = await this.db
      .select({
        enrollment: schema.courseEnrollments,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
      })
      .from(schema.courseEnrollments)
      .innerJoin(schema.users, eq(schema.courseEnrollments.employeeId, schema.users.id))
      .where(
        and(
          eq(schema.courseEnrollments.orgId, orgId),
          inArray(schema.courseEnrollments.employeeId, teamIds),
          eq(schema.courseEnrollments.isActive, true),
          lt(schema.courseEnrollments.deadline, now),
        ),
      )
      .orderBy(schema.courseEnrollments.deadline);

    // Filter out completed
    const overdue = rows.filter((r) => r.enrollment.status !== 'completed');

    const courseIds = [...new Set(overdue.map((r) => r.enrollment.courseId))];
    let courseMap: Record<string, string> = {};
    if (courseIds.length > 0) {
      const courses = await this.db
        .select({ id: schema.courses.id, title: schema.courses.title })
        .from(schema.courses)
        .where(inArray(schema.courses.id, courseIds));
      courseMap = Object.fromEntries(courses.map((c) => [c.id, c.title]));
    }

    return {
      data: overdue.map((r) => ({
        ...r.enrollment,
        employeeName: `${r.firstName} ${r.lastName}`,
        courseTitle: courseMap[r.enrollment.courseId] ?? 'Unknown',
      })),
      meta: { total: overdue.length },
    };
  }

  async sendReminder(orgId: string, managerId: string, enrollmentId: string) {
    const [enrollment] = await this.db
      .select()
      .from(schema.courseEnrollments)
      .where(
        and(
          eq(schema.courseEnrollments.id, enrollmentId),
          eq(schema.courseEnrollments.orgId, orgId),
          eq(schema.courseEnrollments.isActive, true),
        ),
      )
      .limit(1);

    if (!enrollment) throw new NotFoundException('Enrollment not found');

    // Verify the employee is a team member
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (!teamIds.includes(enrollment.employeeId)) {
      throw new NotFoundException('Employee is not a direct report');
    }

    // Update metadata with reminder info
    const existingMeta = (enrollment.metadata as Record<string, any>) ?? {};
    const reminders = existingMeta.reminders ?? [];
    reminders.push({ sentAt: new Date().toISOString(), sentBy: managerId });

    await this.db
      .update(schema.courseEnrollments)
      .set({
        metadata: { ...existingMeta, reminders },
        updatedAt: new Date(),
      })
      .where(eq(schema.courseEnrollments.id, enrollmentId));

    return { success: true, message: 'Reminder sent', totalReminders: reminders.length };
  }
}
