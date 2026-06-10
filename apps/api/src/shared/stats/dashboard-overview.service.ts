import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, lte, max, ne, sum } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import * as schema from '../../infrastructure/database/schema';
import { buildUserNameMap } from '../database/user-names.util';
import type {
  AdminOverview,
  ApprovalQueueItem,
  AttendancePoint,
  ComplianceAlert,
  DashboardOverviewResponse,
  EmployeeOverview,
  ManagerOverview,
  MyRequestItem,
  RatingBucket,
  SeriesPoint,
} from './dashboard-overview.types';

// Drizzle numeric()/sum()/avg() values arrive as strings — coerce everything.
const num = (x: unknown): number => Number(x) || 0;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function addYears(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

/** Last day of the month k months before the effective date's month. */
function monthEndOffset(dateStr: string, k: number): { end: string; label: string } {
  const d = new Date(dateStr + 'T00:00:00Z');
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - k + 1, 0));
  return {
    end: end.toISOString().slice(0, 10),
    label: `${MONTH_NAMES[end.getUTCMonth()]} ${String(end.getUTCFullYear()).slice(2)}`,
  };
}

function diffInDays(dateStr: string, fromStr: string): number {
  return Math.round(
    (new Date(dateStr + 'T00:00:00Z').getTime() - new Date(fromStr + 'T00:00:00Z').getTime()) / 86_400_000,
  );
}

@Injectable()
export class DashboardOverviewService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getOverview(ctx: { orgId: string; userId: string; role: string }): Promise<DashboardOverviewResponse> {
    if (ctx.role === 'admin' || ctx.role === 'super_admin') {
      return this.getAdminOverview(ctx.orgId, ctx.userId);
    }
    if (ctx.role === 'manager') {
      return this.getManagerOverview(ctx.orgId, ctx.userId);
    }
    return this.getEmployeeOverview(ctx.orgId, ctx.userId);
  }

  /**
   * The dataset's "today": the most recent attendance date in the org. The demo
   * seed anchors all data to SEED_TODAY while real time drifts past it, so
   * "today"-style KPIs key off this date. Falls back to the real current date.
   */
  private async getEffectiveDate(orgId: string): Promise<string> {
    const [row] = await this.db
      .select({ d: max(schema.attendanceRecords.date) })
      .from(schema.attendanceRecords)
      .where(eq(schema.attendanceRecords.orgId, orgId));
    return row?.d ?? new Date().toISOString().slice(0, 10);
  }

  private async getFirstName(userId: string): Promise<string> {
    const [row] = await this.db
      .select({ firstName: schema.users.firstName })
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    return row?.firstName ?? 'there';
  }

  // ── ADMIN ──────────────────────────────────────────────────────────────────

  private async getAdminOverview(orgId: string, userId: string): Promise<AdminOverview> {
    const [effectiveDate, greetingName] = await Promise.all([
      this.getEffectiveDate(orgId),
      this.getFirstName(userId),
    ]);
    const yearAgo = addYears(effectiveDate, -1);

    const [
      dojRows,
      attendanceToday,
      attendanceRecent,
      pendingLeave,
      pendingOt,
      pendingTs,
      pendingExp,
      latestRun,
      payslipMonths,
      deptRows,
      activityRows,
      expiringDocs,
      expiringCerts,
      candidateCount,
      applicationByStatus,
      interviewCount,
      offersByStatus,
    ] = await Promise.all([
      this.db
        .select({ doj: schema.employeeProfiles.dateOfJoining })
        .from(schema.employeeProfiles)
        .innerJoin(schema.users, eq(schema.employeeProfiles.userId, schema.users.id))
        .where(and(eq(schema.employeeProfiles.orgId, orgId), eq(schema.users.isActive, true))),
      this.db
        .select({ status: schema.attendanceRecords.status, c: count() })
        .from(schema.attendanceRecords)
        .where(and(eq(schema.attendanceRecords.orgId, orgId), eq(schema.attendanceRecords.date, effectiveDate)))
        .groupBy(schema.attendanceRecords.status),
      this.db
        .select({ date: schema.attendanceRecords.date, status: schema.attendanceRecords.status, c: count() })
        .from(schema.attendanceRecords)
        .where(
          and(
            eq(schema.attendanceRecords.orgId, orgId),
            gte(schema.attendanceRecords.date, addDays(effectiveDate, -16)),
            lte(schema.attendanceRecords.date, effectiveDate),
          ),
        )
        .groupBy(schema.attendanceRecords.date, schema.attendanceRecords.status),
      this.db
        .select({ c: count() })
        .from(schema.leaveRequests)
        .where(and(eq(schema.leaveRequests.orgId, orgId), eq(schema.leaveRequests.status, 'pending'))),
      this.db
        .select({ c: count() })
        .from(schema.overtimeRequests)
        .where(and(eq(schema.overtimeRequests.orgId, orgId), eq(schema.overtimeRequests.status, 'pending'))),
      this.db
        .select({ c: count() })
        .from(schema.timesheetSubmissions)
        .where(and(eq(schema.timesheetSubmissions.orgId, orgId), eq(schema.timesheetSubmissions.status, 'submitted'))),
      this.db
        .select({ c: count() })
        .from(schema.expenseReports)
        .where(
          and(
            eq(schema.expenseReports.orgId, orgId),
            eq(schema.expenseReports.status, 'submitted'),
            eq(schema.expenseReports.isActive, true),
          ),
        ),
      this.db
        .select({
          month: schema.payrollRuns.month,
          year: schema.payrollRuns.year,
          gross: schema.payrollRuns.totalGrossPay,
        })
        .from(schema.payrollRuns)
        .where(and(eq(schema.payrollRuns.orgId, orgId), eq(schema.payrollRuns.isActive, true)))
        .orderBy(desc(schema.payrollRuns.year), desc(schema.payrollRuns.month))
        .limit(1),
      this.db
        .select({ month: schema.paySlips.month, year: schema.paySlips.year, total: sum(schema.paySlips.grossEarnings) })
        .from(schema.paySlips)
        .where(and(eq(schema.paySlips.orgId, orgId), eq(schema.paySlips.isActive, true)))
        .groupBy(schema.paySlips.year, schema.paySlips.month)
        .orderBy(asc(schema.paySlips.year), asc(schema.paySlips.month)),
      this.db
        .select({ name: schema.departments.name, c: count() })
        .from(schema.employeeProfiles)
        .leftJoin(schema.departments, eq(schema.employeeProfiles.departmentId, schema.departments.id))
        .where(eq(schema.employeeProfiles.orgId, orgId))
        .groupBy(schema.departments.name),
      this.db
        .select({
          id: schema.auditLogs.id,
          userId: schema.auditLogs.userId,
          action: schema.auditLogs.action,
          entity: schema.auditLogs.entity,
          description: schema.auditLogs.description,
          createdAt: schema.auditLogs.createdAt,
        })
        .from(schema.auditLogs)
        // DSARs live in audit_logs too (action='data_request') — they'd dominate the feed.
        .where(and(eq(schema.auditLogs.orgId, orgId), ne(schema.auditLogs.action, 'data_request')))
        .orderBy(desc(schema.auditLogs.createdAt))
        .limit(8),
      this.db
        .select({
          name: schema.documents.name,
          employeeId: schema.documents.employeeId,
          expiryDate: schema.documents.expiryDate,
        })
        .from(schema.documents)
        .where(
          and(
            eq(schema.documents.orgId, orgId),
            isNotNull(schema.documents.expiryDate),
            gte(schema.documents.expiryDate, addDays(effectiveDate, -30)),
            lte(schema.documents.expiryDate, addDays(effectiveDate, 30)),
          ),
        ),
      this.db
        .select({
          name: schema.certifications.name,
          employeeId: schema.certifications.employeeId,
          expiryDate: schema.certifications.expiryDate,
        })
        .from(schema.certifications)
        .where(
          and(
            eq(schema.certifications.orgId, orgId),
            eq(schema.certifications.isActive, true),
            isNotNull(schema.certifications.expiryDate),
            gte(schema.certifications.expiryDate, addDays(effectiveDate, -30)),
            lte(schema.certifications.expiryDate, addDays(effectiveDate, 60)),
          ),
        ),
      this.db
        .select({ c: count() })
        .from(schema.candidates)
        .where(and(eq(schema.candidates.orgId, orgId), eq(schema.candidates.isActive, true))),
      this.db
        .select({ status: schema.applications.status, c: count() })
        .from(schema.applications)
        .where(and(eq(schema.applications.orgId, orgId), eq(schema.applications.isActive, true)))
        .groupBy(schema.applications.status),
      this.db
        .select({ c: count() })
        .from(schema.interviews)
        .where(eq(schema.interviews.orgId, orgId)),
      this.db
        .select({ status: schema.offerLetters.status, c: count() })
        .from(schema.offerLetters)
        .where(eq(schema.offerLetters.orgId, orgId))
        .groupBy(schema.offerLetters.status),
    ]);

    // Headcount KPI + 12-month trend from dateOfJoining (coherent with the KPI;
    // analyticsSnapshots are intentionally NOT used — their demo ramp disagrees).
    const headcount = dojRows.length;
    const headcountYearAgo = dojRows.filter((r) => r.doj && r.doj <= yearAgo).length;
    const headcountTrend: SeriesPoint[] = [];
    for (let k = 11; k >= 0; k--) {
      const { end, label } = monthEndOffset(effectiveDate, k);
      headcountTrend.push({ label, value: dojRows.filter((r) => r.doj && r.doj <= end).length });
    }

    const attTotal = attendanceToday.reduce((s, r) => s + num(r.c), 0);
    const attAbsent = num(attendanceToday.find((r) => r.status === 'absent')?.c);
    const attendanceRate = attTotal === 0 ? 0 : Math.round((100 * (attTotal - attAbsent)) / attTotal);

    // Attendance spark: per-day non-absent rate over the last ~12 seeded weekdays.
    const byDate = new Map<string, { total: number; absent: number }>();
    for (const r of attendanceRecent) {
      const d = byDate.get(r.date) ?? { total: 0, absent: 0 };
      d.total += num(r.c);
      if (r.status === 'absent') d.absent += num(r.c);
      byDate.set(r.date, d);
    }
    const attendanceSpark = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => (v.total === 0 ? 0 : Math.round((100 * (v.total - v.absent)) / v.total)));

    const leaveC = num(pendingLeave[0]?.c);
    const otC = num(pendingOt[0]?.c);
    const tsC = num(pendingTs[0]?.c);
    const expC = num(pendingExp[0]?.c);

    const run = latestRun[0];
    const payrollSpark = payslipMonths.map((m) => num(m.total));

    const names = await buildUserNameMap(this.db, [
      ...activityRows.map((r) => r.userId),
      ...expiringDocs.map((d) => d.employeeId),
      ...expiringCerts.map((c) => c.employeeId),
    ]);

    const complianceAlerts: ComplianceAlert[] = [
      ...expiringDocs.map((d) => ({ kind: 'document' as const, name: d.name, employeeId: d.employeeId, expiryDate: d.expiryDate! })),
      ...expiringCerts.map((c) => ({ kind: 'certification' as const, name: c.name, employeeId: c.employeeId, expiryDate: c.expiryDate! })),
    ]
      .map((a) => {
        const daysLeft = diffInDays(a.expiryDate, effectiveDate);
        return {
          kind: a.kind,
          name: a.name,
          employeeName: names.get(a.employeeId) ?? '—',
          expiryDate: a.expiryDate,
          daysLeft,
          severity: (daysLeft < 0 ? 'expired' : daysLeft <= 15 ? 'critical' : 'warning') as ComplianceAlert['severity'],
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const appTotal = applicationByStatus.reduce((s, r) => s + num(r.c), 0);
    const offerTotal = offersByStatus.reduce((s, r) => s + num(r.c), 0);

    return {
      role: 'admin',
      effectiveDate,
      greetingName,
      kpis: {
        headcount: {
          label: 'Headcount',
          value: headcount,
          delta: headcount - headcountYearAgo,
          deltaLabel: 'vs 12 months ago',
          spark: headcountTrend.map((p) => p.value),
        },
        attendanceRate: {
          label: 'Attendance today',
          value: attendanceRate,
          unit: '%',
          spark: attendanceSpark,
        },
        pendingApprovals: {
          label: 'Pending approvals',
          value: leaveC + otC + tsC + expC,
          deltaLabel: `${leaveC} leave · ${expC} expense · ${otC} OT · ${tsC} timesheets`,
        },
        monthlyPayrollCost: {
          label: 'Payroll / month',
          value: num(run?.gross),
          unit: 'INR',
          deltaLabel: run ? `${MONTH_NAMES[run.month - 1]} ${run.year} run` : 'No payroll runs yet',
          spark: payrollSpark,
        },
      },
      charts: {
        headcountTrend,
        departmentDistribution: deptRows
          .map((d) => ({ name: d.name ?? 'Unassigned', value: num(d.c) }))
          .sort((a, b) => b.value - a.value),
      },
      widgets: {
        pendingApprovals: [
          { type: 'leave', label: 'Leave requests', count: leaveC, moduleId: 'leave-management' },
          { type: 'expense', label: 'Expense reports', count: expC, moduleId: 'expense-management' },
          { type: 'overtime', label: 'Overtime requests', count: otC, moduleId: 'attendance' },
          { type: 'timesheet', label: 'Timesheets', count: tsC, moduleId: 'daily-work-logging' },
        ],
        recentActivity: activityRows.map((r) => ({
          id: r.id,
          userName: (r.userId && names.get(r.userId)) || 'System',
          action: r.action,
          entity: r.entity,
          description: r.description,
          createdAt: r.createdAt.toISOString(),
        })),
        complianceAlerts,
        hiringFunnel: [
          { stage: 'candidates', count: num(candidateCount[0]?.c) },
          {
            stage: 'applications',
            count: appTotal,
            byStatus: Object.fromEntries(applicationByStatus.map((r) => [r.status, num(r.c)])),
          },
          { stage: 'interviews', count: num(interviewCount[0]?.c) },
          {
            stage: 'offers',
            count: offerTotal,
            byStatus: Object.fromEntries(offersByStatus.map((r) => [r.status, num(r.c)])),
          },
        ],
      },
    };
  }

  // ── MANAGER ────────────────────────────────────────────────────────────────

  private async getManagerOverview(orgId: string, userId: string): Promise<ManagerOverview> {
    const [effectiveDate, greetingName, teamRows] = await Promise.all([
      this.getEffectiveDate(orgId),
      this.getFirstName(userId),
      this.db
        .select({ userId: schema.employeeProfiles.userId })
        .from(schema.employeeProfiles)
        .innerJoin(schema.users, eq(schema.employeeProfiles.userId, schema.users.id))
        .where(
          and(
            eq(schema.employeeProfiles.orgId, orgId),
            eq(schema.employeeProfiles.managerId, userId),
            eq(schema.users.isActive, true),
          ),
        ),
    ]);
    const teamIds = teamRows.map((t) => t.userId);
    const teamSize = teamIds.length;

    if (teamSize === 0) {
      // Never run inArray() with an empty list — return a zeroed payload.
      return {
        role: 'manager',
        effectiveDate,
        greetingName,
        kpis: {
          teamSize: { label: 'Team size', value: 0 },
          presentToday: { label: 'Present today', value: 0, deltaLabel: 'of 0' },
          myPendingApprovals: { label: 'Pending approvals', value: 0 },
          teamAvgRating: { label: 'Team avg rating', value: 0, deltaLabel: 'No reviews yet' },
        },
        charts: {
          teamAttendanceToday: { present: 0, late: 0, halfDay: 0, absent: 0 },
          ratingDistribution: [],
        },
        widgets: { approvalsQueue: [], onLeave: [], upcomingOneOnOnes: [] },
      };
    }

    const [attendanceRows, leaveRows, otRows, tsRows, expRows, reviewRows, currentLeave, upcomingLeave, oneOnOnes] =
      await Promise.all([
        this.db
          .select({ status: schema.attendanceRecords.status, c: count() })
          .from(schema.attendanceRecords)
          .where(
            and(
              eq(schema.attendanceRecords.orgId, orgId),
              eq(schema.attendanceRecords.date, effectiveDate),
              inArray(schema.attendanceRecords.employeeId, teamIds),
            ),
          )
          .groupBy(schema.attendanceRecords.status),
        this.db
          .select({
            id: schema.leaveRequests.id,
            employeeId: schema.leaveRequests.employeeId,
            fromDate: schema.leaveRequests.fromDate,
            toDate: schema.leaveRequests.toDate,
            totalDays: schema.leaveRequests.totalDays,
            createdAt: schema.leaveRequests.createdAt,
            leaveTypeName: schema.leaveTypes.name,
          })
          .from(schema.leaveRequests)
          .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
          .where(
            and(
              eq(schema.leaveRequests.orgId, orgId),
              eq(schema.leaveRequests.status, 'pending'),
              inArray(schema.leaveRequests.employeeId, teamIds),
            ),
          ),
        this.db
          .select({
            id: schema.overtimeRequests.id,
            employeeId: schema.overtimeRequests.employeeId,
            date: schema.overtimeRequests.date,
            estimatedHours: schema.overtimeRequests.estimatedHours,
            reason: schema.overtimeRequests.reason,
          })
          .from(schema.overtimeRequests)
          .where(
            and(
              eq(schema.overtimeRequests.orgId, orgId),
              eq(schema.overtimeRequests.status, 'pending'),
              inArray(schema.overtimeRequests.employeeId, teamIds),
            ),
          ),
        this.db
          .select({
            id: schema.timesheetSubmissions.id,
            employeeId: schema.timesheetSubmissions.employeeId,
            periodStart: schema.timesheetSubmissions.periodStart,
            periodEnd: schema.timesheetSubmissions.periodEnd,
            totalHours: schema.timesheetSubmissions.totalHours,
            submittedAt: schema.timesheetSubmissions.submittedAt,
          })
          .from(schema.timesheetSubmissions)
          .where(
            and(
              eq(schema.timesheetSubmissions.orgId, orgId),
              eq(schema.timesheetSubmissions.status, 'submitted'),
              inArray(schema.timesheetSubmissions.employeeId, teamIds),
            ),
          ),
        this.db
          .select({
            id: schema.expenseReports.id,
            employeeId: schema.expenseReports.employeeId,
            title: schema.expenseReports.title,
            totalAmount: schema.expenseReports.totalAmount,
            submittedAt: schema.expenseReports.submittedAt,
          })
          .from(schema.expenseReports)
          .where(
            and(
              eq(schema.expenseReports.orgId, orgId),
              eq(schema.expenseReports.status, 'submitted'),
              eq(schema.expenseReports.isActive, true),
              inArray(schema.expenseReports.employeeId, teamIds),
            ),
          ),
        this.db
          .select({ finalRating: schema.reviewAssignments.finalRating, status: schema.reviewAssignments.status })
          .from(schema.reviewAssignments)
          .where(
            and(
              eq(schema.reviewAssignments.orgId, orgId),
              eq(schema.reviewAssignments.reviewerId, userId),
              eq(schema.reviewAssignments.isActive, true),
            ),
          ),
        this.db
          .select({
            employeeId: schema.leaveRequests.employeeId,
            fromDate: schema.leaveRequests.fromDate,
            toDate: schema.leaveRequests.toDate,
            totalDays: schema.leaveRequests.totalDays,
            status: schema.leaveRequests.status,
            leaveTypeName: schema.leaveTypes.name,
          })
          .from(schema.leaveRequests)
          .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
          .where(
            and(
              eq(schema.leaveRequests.orgId, orgId),
              eq(schema.leaveRequests.status, 'approved'),
              inArray(schema.leaveRequests.employeeId, teamIds),
              lte(schema.leaveRequests.fromDate, effectiveDate),
              gte(schema.leaveRequests.toDate, effectiveDate),
            ),
          ),
        this.db
          .select({
            employeeId: schema.leaveRequests.employeeId,
            fromDate: schema.leaveRequests.fromDate,
            toDate: schema.leaveRequests.toDate,
            totalDays: schema.leaveRequests.totalDays,
            status: schema.leaveRequests.status,
            leaveTypeName: schema.leaveTypes.name,
          })
          .from(schema.leaveRequests)
          .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
          .where(
            and(
              eq(schema.leaveRequests.orgId, orgId),
              inArray(schema.leaveRequests.status, ['approved', 'pending']),
              inArray(schema.leaveRequests.employeeId, teamIds),
              gt(schema.leaveRequests.fromDate, effectiveDate),
              lte(schema.leaveRequests.fromDate, addDays(effectiveDate, 14)),
            ),
          )
          .orderBy(asc(schema.leaveRequests.fromDate)),
        this.db
          .select({
            id: schema.oneOnOneMeetings.id,
            employeeId: schema.oneOnOneMeetings.employeeId,
            scheduledAt: schema.oneOnOneMeetings.scheduledAt,
            duration: schema.oneOnOneMeetings.duration,
          })
          .from(schema.oneOnOneMeetings)
          .where(
            and(
              eq(schema.oneOnOneMeetings.orgId, orgId),
              eq(schema.oneOnOneMeetings.managerId, userId),
              eq(schema.oneOnOneMeetings.status, 'scheduled'),
              gte(schema.oneOnOneMeetings.scheduledAt, new Date(effectiveDate + 'T00:00:00Z')),
            ),
          )
          .orderBy(asc(schema.oneOnOneMeetings.scheduledAt))
          .limit(5),
      ]);

    const names = await buildUserNameMap(this.db, [
      ...leaveRows.map((r) => r.employeeId),
      ...otRows.map((r) => r.employeeId),
      ...tsRows.map((r) => r.employeeId),
      ...expRows.map((r) => r.employeeId),
      ...currentLeave.map((r) => r.employeeId),
      ...upcomingLeave.map((r) => r.employeeId),
      ...oneOnOnes.map((r) => r.employeeId),
    ]);
    const nameOf = (id: string) => names.get(id) ?? '—';

    const bucket = (status: string) => num(attendanceRows.find((r) => r.status === status)?.c);
    const present = bucket('present');
    const late = bucket('late');
    const halfDay = bucket('half_day');
    let absent = bucket('absent');
    const counted = present + late + halfDay + absent;
    if (counted < teamSize) absent += teamSize - counted; // members with no record that day

    const rated = reviewRows.filter((r) => r.finalRating !== null);
    const avgRating = rated.length
      ? Math.round((rated.reduce((s, r) => s + num(r.finalRating), 0) / rated.length) * 10) / 10
      : 0;
    const ratingDistribution: RatingBucket[] = (['5', '4', '3', '2', '1'] as const).map((r) => ({
      rating: r,
      count: rated.filter((row) => String(Math.round(num(row.finalRating))) === r).length,
    }));
    ratingDistribution.push({ rating: 'pending', count: reviewRows.length - rated.length });

    const queue: ApprovalQueueItem[] = [
      ...leaveRows.map((r) => ({
        id: r.id,
        type: 'leave' as const,
        employeeName: nameOf(r.employeeId),
        detail: `${r.leaveTypeName} · ${num(r.totalDays)}d from ${r.fromDate}`,
        date: r.createdAt ? r.createdAt.toISOString().slice(0, 10) : r.fromDate,
        moduleId: 'leave-management',
      })),
      ...otRows.map((r) => ({
        id: r.id,
        type: 'overtime' as const,
        employeeName: nameOf(r.employeeId),
        detail: `${num(r.estimatedHours)}h overtime on ${r.date}`,
        date: r.date,
        moduleId: 'attendance',
      })),
      ...tsRows.map((r) => ({
        id: r.id,
        type: 'timesheet' as const,
        employeeName: nameOf(r.employeeId),
        detail: `Timesheet ${r.periodStart} – ${r.periodEnd} · ${num(r.totalHours)}h`,
        date: r.submittedAt ? r.submittedAt.toISOString().slice(0, 10) : r.periodEnd,
        moduleId: 'daily-work-logging',
      })),
      ...expRows.map((r) => ({
        id: r.id,
        type: 'expense' as const,
        employeeName: nameOf(r.employeeId),
        detail: `${r.title} · ₹${num(r.totalAmount).toLocaleString('en-IN')}`,
        date: r.submittedAt ? r.submittedAt.toISOString().slice(0, 10) : effectiveDate,
        moduleId: 'expense-management',
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);

    return {
      role: 'manager',
      effectiveDate,
      greetingName,
      kpis: {
        teamSize: { label: 'Team size', value: teamSize, deltaLabel: 'direct reports' },
        presentToday: { label: 'Present today', value: teamSize - absent, deltaLabel: `of ${teamSize}` },
        myPendingApprovals: {
          label: 'Pending approvals',
          value: leaveRows.length + otRows.length + tsRows.length + expRows.length,
          deltaLabel: `${leaveRows.length} leave · ${expRows.length} expense · ${otRows.length} OT · ${tsRows.length} timesheets`,
        },
        teamAvgRating: {
          label: 'Team avg rating',
          value: avgRating,
          deltaLabel: rated.length ? `${rated.length} completed reviews` : 'No completed reviews',
        },
      },
      charts: {
        teamAttendanceToday: { present, late, halfDay, absent },
        ratingDistribution,
      },
      widgets: {
        approvalsQueue: queue,
        onLeave: [
          ...currentLeave.map((r) => ({
            employeeName: nameOf(r.employeeId),
            leaveTypeName: r.leaveTypeName,
            fromDate: r.fromDate,
            toDate: r.toDate,
            totalDays: num(r.totalDays),
            status: r.status as 'approved' | 'pending',
            isCurrent: true,
          })),
          ...upcomingLeave.map((r) => ({
            employeeName: nameOf(r.employeeId),
            leaveTypeName: r.leaveTypeName,
            fromDate: r.fromDate,
            toDate: r.toDate,
            totalDays: num(r.totalDays),
            status: r.status as 'approved' | 'pending',
            isCurrent: false,
          })),
        ].slice(0, 6),
        upcomingOneOnOnes: oneOnOnes.map((m) => ({
          id: m.id,
          employeeName: nameOf(m.employeeId),
          scheduledAt: m.scheduledAt.toISOString(),
          duration: m.duration ?? 30,
        })),
      },
    };
  }

  // ── EMPLOYEE ───────────────────────────────────────────────────────────────

  private async getEmployeeOverview(orgId: string, userId: string): Promise<EmployeeOverview> {
    const [effectiveDate, greetingName] = await Promise.all([
      this.getEffectiveDate(orgId),
      this.getFirstName(userId),
    ]);
    const monthStart = effectiveDate.slice(0, 8) + '01';
    const effYear = effectiveDate.slice(0, 4);

    const [balanceRows, mtdRows, trendRows, goalRows, lastSlip, myLeave, mySsr, myExpenses, myOt, holidays] =
      await Promise.all([
        this.db
          .select({
            leaveType: schema.leaveTypes.name,
            code: schema.leaveTypes.code,
            color: schema.leaveTypes.color,
            entitled: schema.leaveBalances.entitled,
            used: schema.leaveBalances.used,
            available: schema.leaveBalances.available,
          })
          .from(schema.leaveBalances)
          .innerJoin(schema.leaveTypes, eq(schema.leaveBalances.leaveTypeId, schema.leaveTypes.id))
          .where(
            and(
              eq(schema.leaveBalances.orgId, orgId),
              eq(schema.leaveBalances.employeeId, userId),
              eq(schema.leaveBalances.year, effYear),
            ),
          ),
        this.db
          .select({ status: schema.attendanceRecords.status, c: count() })
          .from(schema.attendanceRecords)
          .where(
            and(
              eq(schema.attendanceRecords.orgId, orgId),
              eq(schema.attendanceRecords.employeeId, userId),
              gte(schema.attendanceRecords.date, monthStart),
              lte(schema.attendanceRecords.date, effectiveDate),
            ),
          )
          .groupBy(schema.attendanceRecords.status),
        this.db
          .select({ date: schema.attendanceRecords.date, status: schema.attendanceRecords.status })
          .from(schema.attendanceRecords)
          .where(and(eq(schema.attendanceRecords.orgId, orgId), eq(schema.attendanceRecords.employeeId, userId)))
          .orderBy(desc(schema.attendanceRecords.date))
          .limit(20),
        this.db
          .select({
            id: schema.goals.id,
            title: schema.goals.title,
            status: schema.goals.status,
            progress: schema.goals.progress,
            dueDate: schema.goals.dueDate,
          })
          .from(schema.goals)
          .where(
            and(
              eq(schema.goals.orgId, orgId),
              eq(schema.goals.employeeId, userId),
              eq(schema.goals.isActive, true),
              eq(schema.goals.isTemplate, false),
            ),
          ),
        this.db
          .select({ month: schema.paySlips.month, year: schema.paySlips.year, netPay: schema.paySlips.netPay })
          .from(schema.paySlips)
          .where(
            and(eq(schema.paySlips.orgId, orgId), eq(schema.paySlips.employeeId, userId), eq(schema.paySlips.isActive, true)),
          )
          .orderBy(desc(schema.paySlips.year), desc(schema.paySlips.month))
          .limit(1),
        this.db
          .select({
            id: schema.leaveRequests.id,
            fromDate: schema.leaveRequests.fromDate,
            totalDays: schema.leaveRequests.totalDays,
            status: schema.leaveRequests.status,
            createdAt: schema.leaveRequests.createdAt,
            leaveTypeName: schema.leaveTypes.name,
          })
          .from(schema.leaveRequests)
          .innerJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
          .where(
            and(
              eq(schema.leaveRequests.orgId, orgId),
              eq(schema.leaveRequests.employeeId, userId),
              eq(schema.leaveRequests.status, 'pending'),
            ),
          ),
        this.db
          .select({
            id: schema.selfServiceRequests.id,
            subject: schema.selfServiceRequests.subject,
            status: schema.selfServiceRequests.status,
            createdAt: schema.selfServiceRequests.createdAt,
          })
          .from(schema.selfServiceRequests)
          .where(
            and(
              eq(schema.selfServiceRequests.orgId, orgId),
              eq(schema.selfServiceRequests.employeeId, userId),
              inArray(schema.selfServiceRequests.status, ['pending', 'in_review']),
            ),
          ),
        this.db
          .select({
            id: schema.expenseReports.id,
            title: schema.expenseReports.title,
            status: schema.expenseReports.status,
            totalAmount: schema.expenseReports.totalAmount,
            createdAt: schema.expenseReports.createdAt,
          })
          .from(schema.expenseReports)
          .where(
            and(
              eq(schema.expenseReports.orgId, orgId),
              eq(schema.expenseReports.employeeId, userId),
              eq(schema.expenseReports.isActive, true),
              inArray(schema.expenseReports.status, ['draft', 'submitted']),
            ),
          ),
        this.db
          .select({
            id: schema.overtimeRequests.id,
            date: schema.overtimeRequests.date,
            estimatedHours: schema.overtimeRequests.estimatedHours,
            status: schema.overtimeRequests.status,
          })
          .from(schema.overtimeRequests)
          .where(
            and(
              eq(schema.overtimeRequests.orgId, orgId),
              eq(schema.overtimeRequests.employeeId, userId),
              eq(schema.overtimeRequests.status, 'pending'),
            ),
          ),
        this.db
          .select({
            name: schema.holidayCalendars.name,
            date: schema.holidayCalendars.date,
            type: schema.holidayCalendars.type,
            isOptional: schema.holidayCalendars.isOptional,
          })
          .from(schema.holidayCalendars)
          .where(and(eq(schema.holidayCalendars.orgId, orgId), gt(schema.holidayCalendars.date, effectiveDate)))
          .orderBy(asc(schema.holidayCalendars.date))
          .limit(5),
      ]);

    const mtdTotal = mtdRows.reduce((s, r) => s + num(r.c), 0);
    const mtdAbsent = num(mtdRows.find((r) => r.status === 'absent')?.c);
    const attendanceMtd = mtdTotal === 0 ? 0 : Math.round((100 * (mtdTotal - mtdAbsent)) / mtdTotal);

    const attendanceTrend: AttendancePoint[] = trendRows
      .slice()
      .reverse()
      .map((r) => ({
        date: r.date,
        status: r.status,
        value: (r.status === 'absent' ? 0 : r.status === 'half_day' ? 0.5 : 1) as 0 | 0.5 | 1,
      }));

    const openGoals = goalRows.filter((g) => !['completed', 'cancelled'].includes(g.status));
    const slip = lastSlip[0];

    const myRequests: MyRequestItem[] = [
      ...myLeave.map((r) => ({
        id: r.id,
        type: 'leave' as const,
        title: `${r.leaveTypeName} · ${num(r.totalDays)}d from ${r.fromDate}`,
        status: r.status,
        date: r.createdAt ? r.createdAt.toISOString().slice(0, 10) : r.fromDate,
      })),
      ...mySsr.map((r) => ({
        id: r.id,
        type: 'self_service' as const,
        title: r.subject,
        status: r.status,
        date: r.createdAt ? r.createdAt.toISOString().slice(0, 10) : effectiveDate,
      })),
      ...myExpenses.map((r) => ({
        id: r.id,
        type: 'expense' as const,
        title: `${r.title} · ₹${num(r.totalAmount).toLocaleString('en-IN')}`,
        status: r.status,
        date: r.createdAt ? r.createdAt.toISOString().slice(0, 10) : effectiveDate,
      })),
      ...myOt.map((r) => ({
        id: r.id,
        type: 'overtime' as const,
        title: `Overtime ${num(r.estimatedHours)}h on ${r.date}`,
        status: r.status,
        date: r.date,
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);

    return {
      role: 'employee',
      effectiveDate,
      greetingName,
      kpis: {
        leaveBalanceTotal: {
          label: 'Leave balance',
          value: Math.round(balanceRows.reduce((s, b) => s + num(b.available), 0) * 10) / 10,
          unit: 'days',
          deltaLabel: `across ${balanceRows.length} leave types`,
        },
        attendanceRateMTD: {
          label: 'Attendance this month',
          value: attendanceMtd,
          unit: '%',
          deltaLabel: `${mtdTotal} working days tracked`,
          spark: attendanceTrend.slice(-12).map((p) => p.value * 100),
        },
        openGoals: {
          label: 'Open goals',
          value: openGoals.length,
          deltaLabel: `${goalRows.length - openGoals.length} completed`,
        },
        lastPayslipNet: {
          label: 'Last payslip (net)',
          value: num(slip?.netPay),
          unit: 'INR',
          deltaLabel: slip ? `${MONTH_NAMES[slip.month - 1]} ${slip.year}` : 'No payslips yet',
        },
      },
      charts: {
        leaveBalanceByType: balanceRows.map((b) => ({
          leaveType: b.leaveType,
          code: b.code,
          color: b.color,
          entitled: num(b.entitled),
          used: num(b.used),
          available: num(b.available),
        })),
        myAttendanceTrend: attendanceTrend,
      },
      widgets: {
        myRequests,
        upcomingHolidays: holidays.map((h) => ({ name: h.name, date: h.date, type: h.type, isOptional: h.isOptional })),
        goalsList: goalRows
          .map((g) => ({ id: g.id, title: g.title, status: g.status, progress: num(g.progress), dueDate: g.dueDate }))
          .sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0)),
      },
    };
  }
}
