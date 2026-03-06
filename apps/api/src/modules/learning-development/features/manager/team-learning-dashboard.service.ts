import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, inArray, gte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamLearningDashboardService {
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

  async getTeamDashboard(orgId: string, managerId: string) {
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    if (teamIds.length === 0) {
      return {
        teamSize: 0,
        members: [],
        totalEnrollments: 0,
        totalCompletions: 0,
        totalHoursSpent: 0,
        certifications: { total: 0, expiring: 0 },
        complianceStatus: { compliant: 0, nonCompliant: 0 },
      };
    }

    // Get team member names
    const members = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.orgId, orgId), inArray(schema.users.id, teamIds)));

    // Get enrollments for team
    const enrollments = await this.db
      .select()
      .from(schema.courseEnrollments)
      .where(
        and(
          eq(schema.courseEnrollments.orgId, orgId),
          inArray(schema.courseEnrollments.employeeId, teamIds),
          eq(schema.courseEnrollments.isActive, true),
        ),
      );

    const totalEnrollments = enrollments.length;
    const totalCompletions = enrollments.filter((e) => e.status === 'completed').length;
    const totalHoursSpent = Math.round(
      enrollments.reduce((sum, e) => sum + (e.timeSpent ?? 0), 0) / 60,
    );

    // Get certifications for team
    const certifications = await this.db
      .select()
      .from(schema.certifications)
      .where(
        and(
          eq(schema.certifications.orgId, orgId),
          inArray(schema.certifications.employeeId, teamIds),
          eq(schema.certifications.isActive, true),
        ),
      );

    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    const expiringCerts = certifications.filter(
      (c) => c.expiryDate && new Date(c.expiryDate) <= ninetyDaysFromNow && new Date(c.expiryDate) >= now,
    ).length;

    // Check compliance: get mandatory courses
    const mandatoryCourses = await this.db
      .select()
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.orgId, orgId),
          eq(schema.courses.isMandatory, true),
          eq(schema.courses.isActive, true),
        ),
      );

    let compliant = 0;
    let nonCompliant = 0;
    if (mandatoryCourses.length > 0) {
      const mandatoryIds = mandatoryCourses.map((c) => c.id);
      for (const memberId of teamIds) {
        const memberEnrollments = enrollments.filter((e) => e.employeeId === memberId);
        const completedMandatory = memberEnrollments.filter(
          (e) => mandatoryIds.includes(e.courseId) && e.status === 'completed',
        ).length;
        if (completedMandatory >= mandatoryIds.length) compliant++;
        else nonCompliant++;
      }
    } else {
      compliant = teamIds.length;
    }

    // Per-member summary
    const memberSummaries = members.map((m) => {
      const memberEnrollments = enrollments.filter((e) => e.employeeId === m.id);
      const memberCerts = certifications.filter((c) => c.employeeId === m.id);
      return {
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        email: m.email,
        totalEnrollments: memberEnrollments.length,
        completedCourses: memberEnrollments.filter((e) => e.status === 'completed').length,
        inProgressCourses: memberEnrollments.filter((e) => e.status === 'in_progress').length,
        hoursSpent: Math.round(memberEnrollments.reduce((sum, e) => sum + (e.timeSpent ?? 0), 0) / 60),
        certifications: memberCerts.length,
      };
    });

    return {
      teamSize: teamIds.length,
      totalEnrollments,
      totalCompletions,
      completionRate: totalEnrollments > 0 ? Math.round((totalCompletions / totalEnrollments) * 100) : 0,
      totalHoursSpent,
      certifications: { total: certifications.length, expiring: expiringCerts },
      complianceStatus: { compliant, nonCompliant },
      members: memberSummaries,
    };
  }
}
