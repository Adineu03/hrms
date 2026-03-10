import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

const SAMPLE_REPORTS = [
  {
    reportId: 'team-headcount',
    title: 'Team Headcount',
    description: 'Current headcount breakdown by department and designation',
    category: 'workforce',
    format: 'csv',
  },
  {
    reportId: 'leave-summary',
    title: 'Leave Summary',
    description: 'Leave balances, utilization, and pending approvals for your team',
    category: 'leave',
    format: 'csv',
  },
  {
    reportId: 'attendance-rate',
    title: 'Attendance Rate',
    description: 'Monthly attendance rate trend for your team with exceptions',
    category: 'attendance',
    format: 'csv',
  },
  {
    reportId: 'performance-distribution',
    title: 'Performance Distribution',
    description: 'Performance rating distribution across the last review cycle',
    category: 'performance',
    format: 'csv',
  },
];

const SAMPLE_REPORT_DATA: Record<string, Array<Record<string, unknown>>> = {
  'team-headcount': [
    { department: 'Engineering', designation: 'Senior Engineer', count: 8 },
    { department: 'Engineering', designation: 'Junior Engineer', count: 5 },
    { department: 'Product', designation: 'Product Manager', count: 3 },
    { department: 'Design', designation: 'UI Designer', count: 2 },
    { department: 'QA', designation: 'QA Engineer', count: 4 },
  ],
  'leave-summary': [
    { employee: 'Alice Johnson', leaveType: 'Annual Leave', balance: 12, used: 5, pending: 2 },
    { employee: 'Bob Smith', leaveType: 'Annual Leave', balance: 12, used: 8, pending: 0 },
    { employee: 'Carol Davis', leaveType: 'Annual Leave', balance: 12, used: 3, pending: 1 },
    { employee: 'David Lee', leaveType: 'Annual Leave', balance: 12, used: 10, pending: 0 },
  ],
  'attendance-rate': [
    { month: 'January', attendanceRate: 96.2, lateCount: 3, absentCount: 1 },
    { month: 'February', attendanceRate: 97.8, lateCount: 2, absentCount: 0 },
    { month: 'March', attendanceRate: 95.5, lateCount: 5, absentCount: 2 },
  ],
  'performance-distribution': [
    { rating: 'Exceeds Expectations', count: 4, percentage: 18.2 },
    { rating: 'Meets Expectations', count: 12, percentage: 54.5 },
    { rating: 'Needs Improvement', count: 5, percentage: 22.7 },
    { rating: 'Unsatisfactory', count: 1, percentage: 4.5 },
  ],
};

@Injectable()
export class SampleReportsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getSampleReports(orgId: string, userId: string) {
    return { data: SAMPLE_REPORTS, meta: { total: SAMPLE_REPORTS.length } };
  }

  async downloadReport(orgId: string, userId: string, reportId: string) {
    const report = SAMPLE_REPORTS.find((r) => r.reportId === reportId);
    const data = SAMPLE_REPORT_DATA[reportId] ?? [];

    return {
      data: {
        reportId,
        title: report?.title ?? reportId,
        data,
        format: 'csv',
        filename: 'sample-report.csv',
      },
      meta: { total: data.length },
    };
  }
}
