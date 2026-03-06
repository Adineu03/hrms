import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte, or, count, sum, avg, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TimesheetComplianceService {
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

  private async getTeamMembers(orgId: string, managerId: string) {
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
          eq(schema.employeeProfiles.managerId, managerId),
          eq(schema.users.orgId, orgId),
          eq(schema.users.isActive, true),
        ),
      );
  }

  async getSubmissionTracker(orgId: string, managerId: string, startDate?: string, endDate?: string) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    const teamUserIds = teamMembers.map((m) => m.userId);

    if (teamUserIds.length === 0) {
      return {
        period: { start: startDate ?? null, end: endDate ?? null },
        summary: { total: 0, compliant: 0, nonCompliant: 0, complianceRate: 0 },
        members: [],
      };
    }

    // Default to last 4 weeks
    const now = new Date();
    const defaultEnd = now.toISOString().split('T')[0];
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(now.getDate() - 28);
    const defaultStart = fourWeeksAgo.toISOString().split('T')[0];

    const start = startDate ?? defaultStart;
    const end = endDate ?? defaultEnd;

    // Get timesheet policy for submission frequency
    const [policy] = await this.db
      .select({
        submissionFrequency: schema.timesheetPolicies.submissionFrequency,
        submissionDeadline: schema.timesheetPolicies.submissionDeadline,
        dailyMandatory: schema.timesheetPolicies.dailyMandatory,
        gracePeriodDays: schema.timesheetPolicies.gracePeriodDays,
      })
      .from(schema.timesheetPolicies)
      .where(
        and(
          eq(schema.timesheetPolicies.orgId, orgId),
          eq(schema.timesheetPolicies.isActive, true),
          eq(schema.timesheetPolicies.isDefault, true),
        ),
      );

    const frequency = policy?.submissionFrequency ?? 'weekly';
    const gracePeriodDays = policy?.gracePeriodDays ?? 2;

    // Get all submissions in the period
    const submissions = await this.db
      .select({
        id: schema.timesheetSubmissions.id,
        employeeId: schema.timesheetSubmissions.employeeId,
        periodStart: schema.timesheetSubmissions.periodStart,
        periodEnd: schema.timesheetSubmissions.periodEnd,
        status: schema.timesheetSubmissions.status,
        submittedAt: schema.timesheetSubmissions.submittedAt,
        totalHours: schema.timesheetSubmissions.totalHours,
      })
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.orgId, orgId),
          inArray(schema.timesheetSubmissions.employeeId, teamUserIds),
          gte(schema.timesheetSubmissions.periodStart, start),
          lte(schema.timesheetSubmissions.periodEnd, end),
        ),
      )
      .orderBy(desc(schema.timesheetSubmissions.periodStart));

    // Calculate expected submission periods
    const expectedPeriods = calculateExpectedPeriods(start, end, frequency);

    // Group submissions by employee
    const submissionMap = new Map<string, typeof submissions>();
    for (const sub of submissions) {
      if (!submissionMap.has(sub.employeeId)) {
        submissionMap.set(sub.employeeId, []);
      }
      submissionMap.get(sub.employeeId)!.push(sub);
    }

    let compliant = 0;
    let nonCompliant = 0;

    const members = teamMembers.map((member) => {
      const empSubmissions = submissionMap.get(member.userId) ?? [];

      // Check how many expected periods have submissions
      let periodsSubmitted = 0;
      let periodsOnTime = 0;
      let periodsLate = 0;
      let periodsMissing = 0;

      for (const period of expectedPeriods) {
        const matching = empSubmissions.find(
          (s) => s.periodStart <= period.end && s.periodEnd >= period.start,
        );

        if (matching) {
          periodsSubmitted++;

          // Check if submitted on time (within grace period after period end)
          if (matching.submittedAt) {
            const deadlineDate = new Date(period.end);
            deadlineDate.setDate(deadlineDate.getDate() + gracePeriodDays);
            const submittedDate = new Date(matching.submittedAt);

            if (submittedDate <= deadlineDate) {
              periodsOnTime++;
            } else {
              periodsLate++;
            }
          } else {
            // Draft — not yet submitted
            periodsMissing++;
          }
        } else {
          periodsMissing++;
        }
      }

      const totalExpected = expectedPeriods.length;
      const onTimeRate = totalExpected > 0
        ? Math.round((periodsOnTime / totalExpected) * 10000) / 100
        : 0;
      const submissionRate = totalExpected > 0
        ? Math.round((periodsSubmitted / totalExpected) * 10000) / 100
        : 0;

      const isCompliant = submissionRate >= 80 && onTimeRate >= 70;
      if (isCompliant) {
        compliant++;
      } else {
        nonCompliant++;
      }

      // Current period status
      const currentPeriod = expectedPeriods[expectedPeriods.length - 1];
      const currentSubmission = currentPeriod
        ? empSubmissions.find(
            (s) => s.periodStart <= currentPeriod.end && s.periodEnd >= currentPeriod.start,
          )
        : null;

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        isCompliant,
        totalExpectedPeriods: totalExpected,
        periodsSubmitted,
        periodsOnTime,
        periodsLate,
        periodsMissing,
        submissionRate,
        onTimeRate,
        currentPeriodStatus: currentSubmission?.status ?? 'not_started',
        currentPeriodHours: currentSubmission ? Number(currentSubmission.totalHours) : 0,
        submissions: empSubmissions.map((s) => ({
          id: s.id,
          periodStart: s.periodStart,
          periodEnd: s.periodEnd,
          status: s.status,
          submittedAt: s.submittedAt,
          totalHours: Number(s.totalHours),
        })),
      };
    });

    const complianceRate = teamMembers.length > 0
      ? Math.round((compliant / teamMembers.length) * 10000) / 100
      : 0;

    // Sort: non-compliant first, then by submission rate ascending
    members.sort((a, b) => {
      if (a.isCompliant !== b.isCompliant) return a.isCompliant ? 1 : -1;
      return a.submissionRate - b.submissionRate;
    });

    return {
      period: { start, end },
      frequency,
      gracePeriodDays,
      expectedPeriods: expectedPeriods.length,
      summary: {
        total: teamMembers.length,
        compliant,
        nonCompliant,
        complianceRate,
      },
      members,
    };
  }

  async sendReminders(orgId: string, managerId: string, body: Record<string, any>) {
    const { employeeIds, message } = body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      throw new BadRequestException('employeeIds array is required');
    }

    // Verify all employees are direct reports
    const teamIds = await this.getTeamMemberIds(orgId, managerId);
    const validIds = employeeIds.filter((id: string) => teamIds.includes(id));

    if (validIds.length === 0) {
      throw new BadRequestException('No valid direct reports in the provided list');
    }

    // Get employee names for the response
    const employees = await this.db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.orgId, orgId),
          inArray(schema.users.id, validIds),
        ),
      );

    const now = new Date();
    const reminderRecord = {
      sentAt: now.toISOString(),
      sentBy: managerId,
      message: message ?? 'Please submit your timesheet for the current period.',
      recipients: validIds,
    };

    // Store reminder metadata in each employee's latest submission or create a log
    // Since we don't have a dedicated notifications table, we record in the timesheet_submissions metadata
    // For employees with pending submissions, update metadata
    for (const empId of validIds) {
      const [existingSub] = await this.db
        .select({ id: schema.timesheetSubmissions.id, metadata: schema.timesheetSubmissions.metadata })
        .from(schema.timesheetSubmissions)
        .where(
          and(
            eq(schema.timesheetSubmissions.orgId, orgId),
            eq(schema.timesheetSubmissions.employeeId, empId),
            eq(schema.timesheetSubmissions.status, 'draft'),
          ),
        )
        .orderBy(desc(schema.timesheetSubmissions.createdAt))
        .limit(1);

      if (existingSub) {
        const currentMeta = (existingSub.metadata as Record<string, any>) ?? {};
        const reminders = Array.isArray(currentMeta.reminders) ? currentMeta.reminders : [];
        reminders.push({
          sentAt: now.toISOString(),
          sentBy: managerId,
          message: message ?? 'Please submit your timesheet for the current period.',
        });

        await this.db
          .update(schema.timesheetSubmissions)
          .set({
            metadata: { ...currentMeta, reminders },
            updatedAt: now,
          })
          .where(eq(schema.timesheetSubmissions.id, existingSub.id));
      }
    }

    return {
      sentAt: now.toISOString(),
      totalRecipients: validIds.length,
      message: message ?? 'Please submit your timesheet for the current period.',
      recipients: employees.map((e) => ({
        employeeId: e.id,
        employeeName: `${e.firstName} ${e.lastName ?? ''}`.trim(),
        email: e.email,
      })),
    };
  }

  async getComplianceScores(orgId: string, managerId: string) {
    const teamMembers = await this.getTeamMembers(orgId, managerId);
    const teamUserIds = teamMembers.map((m) => m.userId);

    if (teamUserIds.length === 0) {
      return { members: [] };
    }

    // Look at last 12 weeks of data for a meaningful score
    const now = new Date();
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(now.getDate() - 84);
    const start = twelveWeeksAgo.toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];

    // Get policy info
    const [policy] = await this.db
      .select({
        submissionFrequency: schema.timesheetPolicies.submissionFrequency,
        gracePeriodDays: schema.timesheetPolicies.gracePeriodDays,
        dailyMandatory: schema.timesheetPolicies.dailyMandatory,
        minHoursPerDay: schema.timesheetPolicies.minHoursPerDay,
      })
      .from(schema.timesheetPolicies)
      .where(
        and(
          eq(schema.timesheetPolicies.orgId, orgId),
          eq(schema.timesheetPolicies.isActive, true),
          eq(schema.timesheetPolicies.isDefault, true),
        ),
      );

    const frequency = policy?.submissionFrequency ?? 'weekly';
    const gracePeriodDays = policy?.gracePeriodDays ?? 2;
    const expectedHoursPerDay = policy ? Number(policy.minHoursPerDay) || 8 : 8;

    // Get all submissions
    const submissions = await this.db
      .select({
        employeeId: schema.timesheetSubmissions.employeeId,
        periodStart: schema.timesheetSubmissions.periodStart,
        periodEnd: schema.timesheetSubmissions.periodEnd,
        status: schema.timesheetSubmissions.status,
        submittedAt: schema.timesheetSubmissions.submittedAt,
        totalHours: schema.timesheetSubmissions.totalHours,
        rejectedAt: schema.timesheetSubmissions.rejectedAt,
      })
      .from(schema.timesheetSubmissions)
      .where(
        and(
          eq(schema.timesheetSubmissions.orgId, orgId),
          inArray(schema.timesheetSubmissions.employeeId, teamUserIds),
          gte(schema.timesheetSubmissions.periodStart, start),
          lte(schema.timesheetSubmissions.periodEnd, end),
        ),
      );

    // Get timesheet entries for hours analysis
    const entries = await this.db
      .select({
        employeeId: schema.timesheetEntries.employeeId,
        date: schema.timesheetEntries.date,
        hours: schema.timesheetEntries.hours,
      })
      .from(schema.timesheetEntries)
      .where(
        and(
          eq(schema.timesheetEntries.orgId, orgId),
          inArray(schema.timesheetEntries.employeeId, teamUserIds),
          gte(schema.timesheetEntries.date, start),
          lte(schema.timesheetEntries.date, end),
        ),
      );

    const expectedPeriods = calculateExpectedPeriods(start, end, frequency);

    // Group by employee
    const submissionMap = new Map<string, typeof submissions>();
    for (const sub of submissions) {
      if (!submissionMap.has(sub.employeeId)) {
        submissionMap.set(sub.employeeId, []);
      }
      submissionMap.get(sub.employeeId)!.push(sub);
    }

    const entryMap = new Map<string, { totalHours: number; daysLogged: Set<string> }>();
    for (const entry of entries) {
      if (!entryMap.has(entry.employeeId)) {
        entryMap.set(entry.employeeId, { totalHours: 0, daysLogged: new Set() });
      }
      const agg = entryMap.get(entry.employeeId)!;
      agg.totalHours += Number(entry.hours);
      agg.daysLogged.add(entry.date);
    }

    // Count working days in the period
    const workingDays = countWorkingDays(start, end);

    const members = teamMembers.map((member) => {
      const empSubmissions = submissionMap.get(member.userId) ?? [];
      const empEntries = entryMap.get(member.userId) ?? { totalHours: 0, daysLogged: new Set<string>() };

      // Submission rate (weight: 40%)
      let periodsSubmitted = 0;
      let periodsOnTime = 0;
      let periodsRejected = 0;

      for (const period of expectedPeriods) {
        const matching = empSubmissions.find(
          (s) => s.periodStart <= period.end && s.periodEnd >= period.start,
        );

        if (matching && matching.submittedAt) {
          periodsSubmitted++;

          const deadlineDate = new Date(period.end);
          deadlineDate.setDate(deadlineDate.getDate() + gracePeriodDays);
          const submittedDate = new Date(matching.submittedAt);

          if (submittedDate <= deadlineDate) {
            periodsOnTime++;
          }

          if (matching.status === 'rejected') {
            periodsRejected++;
          }
        }
      }

      const totalExpected = expectedPeriods.length || 1;
      const submissionRate = periodsSubmitted / totalExpected;
      const onTimeRate = periodsSubmitted > 0 ? periodsOnTime / periodsSubmitted : 0;
      const rejectionRate = periodsSubmitted > 0 ? periodsRejected / periodsSubmitted : 0;

      // Logging completeness (weight: 30%)
      const loggingCompleteness = workingDays > 0
        ? empEntries.daysLogged.size / workingDays
        : 0;

      // Hours adequacy (weight: 20%)
      const expectedTotalHours = workingDays * expectedHoursPerDay;
      const hoursAdequacy = expectedTotalHours > 0
        ? Math.min(1, empEntries.totalHours / expectedTotalHours)
        : 0;

      // Quality factor (weight: 10%): lower rejection rate = better
      const qualityFactor = 1 - rejectionRate;

      // Composite compliance score (0-100)
      const score = Math.round(
        (submissionRate * 40 +
          onTimeRate * 15 +
          loggingCompleteness * 30 +
          hoursAdequacy * 20 +
          qualityFactor * 10) *
          100,
      ) / 100;

      // Clamp between 0-100
      const clampedScore = Math.max(0, Math.min(100, score));

      let grade: string;
      if (clampedScore >= 90) grade = 'A';
      else if (clampedScore >= 80) grade = 'B';
      else if (clampedScore >= 70) grade = 'C';
      else if (clampedScore >= 60) grade = 'D';
      else grade = 'F';

      return {
        employeeId: member.userId,
        employeeName: `${member.firstName} ${member.lastName ?? ''}`.trim(),
        email: member.email,
        complianceScore: clampedScore,
        grade,
        breakdown: {
          submissionRate: Math.round(submissionRate * 10000) / 100,
          onTimeRate: Math.round(onTimeRate * 10000) / 100,
          loggingCompleteness: Math.round(loggingCompleteness * 10000) / 100,
          hoursAdequacy: Math.round(hoursAdequacy * 10000) / 100,
          qualityFactor: Math.round(qualityFactor * 10000) / 100,
        },
        stats: {
          totalExpectedPeriods: totalExpected,
          periodsSubmitted,
          periodsOnTime,
          periodsRejected,
          daysLogged: empEntries.daysLogged.size,
          workingDays,
          totalHours: Math.round(empEntries.totalHours * 100) / 100,
          expectedHours: Math.round(expectedTotalHours * 100) / 100,
        },
      };
    });

    // Sort by score descending
    members.sort((a, b) => b.complianceScore - a.complianceScore);

    // Team average score
    const avgScore = members.length > 0
      ? Math.round((members.reduce((acc, m) => acc + m.complianceScore, 0) / members.length) * 100) / 100
      : 0;

    return {
      period: { start, end },
      teamSize: members.length,
      teamAverageScore: avgScore,
      gradeDistribution: {
        A: members.filter((m) => m.grade === 'A').length,
        B: members.filter((m) => m.grade === 'B').length,
        C: members.filter((m) => m.grade === 'C').length,
        D: members.filter((m) => m.grade === 'D').length,
        F: members.filter((m) => m.grade === 'F').length,
      },
      members,
    };
  }
}

/** Calculate expected submission periods based on frequency. */
function calculateExpectedPeriods(
  startDate: string,
  endDate: string,
  frequency: string,
): Array<{ start: string; end: string }> {
  const periods: Array<{ start: string; end: string }> = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  if (frequency === 'daily') {
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        const dateStr = current.toISOString().split('T')[0];
        periods.push({ start: dateStr, end: dateStr });
      }
      current.setDate(current.getDate() + 1);
    }
  } else if (frequency === 'weekly') {
    // Align to Monday start
    const dayOfWeek = current.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
    current.setDate(current.getDate() + daysToMonday);

    while (current <= end) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(current.getDate() + 6);

      if (weekEnd > end) break;

      periods.push({
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      });

      current.setDate(current.getDate() + 7);
    }
  } else if (frequency === 'biweekly') {
    const dayOfWeek = current.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
    current.setDate(current.getDate() + daysToMonday);

    while (current <= end) {
      const periodStart = new Date(current);
      const periodEnd = new Date(current);
      periodEnd.setDate(current.getDate() + 13);

      if (periodEnd > end) break;

      periods.push({
        start: periodStart.toISOString().split('T')[0],
        end: periodEnd.toISOString().split('T')[0],
      });

      current.setDate(current.getDate() + 14);
    }
  } else if (frequency === 'monthly') {
    let monthCurrent = new Date(current.getFullYear(), current.getMonth(), 1);

    while (monthCurrent <= end) {
      const monthStart = new Date(monthCurrent);
      const monthEnd = new Date(monthCurrent.getFullYear(), monthCurrent.getMonth() + 1, 0);

      if (monthStart > end) break;

      periods.push({
        start: monthStart.toISOString().split('T')[0],
        end: monthEnd.toISOString().split('T')[0],
      });

      monthCurrent.setMonth(monthCurrent.getMonth() + 1);
    }
  }

  return periods;
}

/** Count working days (Monday-Friday) between two dates inclusive. */
function countWorkingDays(startDate: string, endDate: string): number {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const effectiveEnd = end > today ? today : end;

  while (current <= effectiveEnd) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
