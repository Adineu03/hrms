'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  BarChart3,
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  PieChart,
  Activity,
} from 'lucide-react';

type ReportType = 'utilization' | 'absenteeism' | 'leave_vs_attendance';

interface UtilizationRow {
  employeeId: string;
  employeeName: string;
  leaveType: string;
  entitled: number;
  used: number;
  pending: number;
  available: number;
  utilizationPercent: number;
}

interface AbsenteeismRow {
  employeeId: string;
  employeeName: string;
  totalAbsentDays: number;
  unplannedLeaves: number;
  mondayAbsences: number;
  fridayAbsences: number;
  trend: 'up' | 'down' | 'stable';
  absenteeismRate: number;
}

interface LeaveVsAttendanceRow {
  employeeId: string;
  employeeName: string;
  totalWorkDays: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
  attendanceRate: number;
  leaveRate: number;
}

const REPORT_TYPES: { value: ReportType; label: string; description: string; icon: typeof PieChart }[] = [
  { value: 'utilization', label: 'Leave Utilization', description: 'How team uses their leave quotas', icon: PieChart },
  { value: 'absenteeism', label: 'Absenteeism Analysis', description: 'Absence patterns and frequency', icon: BarChart3 },
  { value: 'leave_vs_attendance', label: 'Leave vs Attendance', description: 'Correlation between leave and attendance', icon: Activity },
];

const selectClassName =
  'px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm';

export default function LeaveReportsTab() {
  const [reportType, setReportType] = useState<ReportType>('utilization');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [utilizationData, setUtilizationData] = useState<UtilizationRow[]>([]);
  const [absenteeismData, setAbsenteeismData] = useState<AbsenteeismRow[]>([]);
  const [leaveVsAttendanceData, setLeaveVsAttendanceData] = useState<LeaveVsAttendanceRow[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const reportEndpoints: Record<ReportType, string> = {
    utilization: '/leave-management/manager/reports/utilization',
    absenteeism: '/leave-management/manager/reports/absenteeism',
    leave_vs_attendance: '/leave-management/manager/reports/leave-vs-attendance',
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setHasGenerated(false);
    try {
      const res = await api.get(reportEndpoints[reportType], {
        params: { startDate, endDate },
      });
      const data = res.data?.data || res.data?.rows || res.data || [];

      switch (reportType) {
        case 'utilization':
          setUtilizationData(data);
          break;
        case 'absenteeism':
          setAbsenteeismData(data);
          break;
        case 'leave_vs_attendance':
          setLeaveVsAttendanceData(data);
          break;
      }
      setHasGenerated(true);
    } catch {
      setError('Failed to generate report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await api.get(`${reportEndpoints[reportType]}/export`, {
        params: { startDate, endDate },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leave-${reportType}-report-${startDate}-${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export report.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderUtilizationTable = () => (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-background border-b border-border">
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Leave Type</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Entitled</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Used</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Pending</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Available</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Utilization</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {utilizationData.map((row, idx) => (
            <tr key={`${row.employeeId}-${row.leaveType}-${idx}`} className="bg-card hover:bg-background/50 transition-colors">
              <td className="px-4 py-3 text-sm text-text font-medium">{row.employeeName}</td>
              <td className="px-4 py-3 text-sm text-text-muted">{row.leaveType}</td>
              <td className="px-4 py-3 text-sm text-text-muted font-medium">{row.entitled}</td>
              <td className="px-4 py-3 text-sm">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.used}</span>
              </td>
              <td className="px-4 py-3 text-sm">
                {row.pending > 0 ? (
                  <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.pending}</span>
                ) : (
                  <span className="text-text-muted text-xs">0</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    row.available <= 2 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}
                >
                  {row.available}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                    <div
                      className={`h-full rounded-full ${
                        row.utilizationPercent >= 80
                          ? 'bg-green-500'
                          : row.utilizationPercent >= 40
                            ? 'bg-blue-500'
                            : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(100, row.utilizationPercent)}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted font-medium">{row.utilizationPercent.toFixed(0)}%</span>
                </div>
              </td>
            </tr>
          ))}
          {utilizationData.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">
                No utilization data for the selected period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderAbsenteeismTable = () => (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-background border-b border-border">
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Absent</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Unplanned</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Mondays</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Fridays</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Rate</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {absenteeismData.map((row) => (
            <tr key={row.employeeId} className="bg-card hover:bg-background/50 transition-colors">
              <td className="px-4 py-3 text-sm text-text font-medium">{row.employeeName}</td>
              <td className="px-4 py-3 text-sm">
                <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.totalAbsentDays}</span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.unplannedLeaves}</span>
              </td>
              <td className="px-4 py-3 text-sm text-text-muted">{row.mondayAbsences}</td>
              <td className="px-4 py-3 text-sm text-text-muted">{row.fridayAbsences}</td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    row.absenteeismRate > 10
                      ? 'bg-red-50 text-red-700'
                      : row.absenteeismRate > 5
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-green-50 text-green-700'
                  }`}
                >
                  {row.absenteeismRate.toFixed(1)}%
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                {row.trend === 'up' && (
                  <span className="inline-flex items-center gap-1 text-red-700">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Increasing</span>
                  </span>
                )}
                {row.trend === 'down' && (
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Decreasing</span>
                  </span>
                )}
                {row.trend === 'stable' && (
                  <span className="text-xs font-medium text-text-muted">Stable</span>
                )}
              </td>
            </tr>
          ))}
          {absenteeismData.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">
                No absenteeism data for the selected period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderLeaveVsAttendanceTable = () => (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-background border-b border-border">
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Work Days</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Present</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Leave Days</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Absent</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Attendance Rate</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Leave Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {leaveVsAttendanceData.map((row) => (
            <tr key={row.employeeId} className="bg-card hover:bg-background/50 transition-colors">
              <td className="px-4 py-3 text-sm text-text font-medium">{row.employeeName}</td>
              <td className="px-4 py-3 text-sm text-text-muted">{row.totalWorkDays}</td>
              <td className="px-4 py-3 text-sm">
                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.presentDays}</span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.leaveDays}</span>
              </td>
              <td className="px-4 py-3 text-sm">
                {row.absentDays > 0 ? (
                  <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.absentDays}</span>
                ) : (
                  <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">0</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    row.attendanceRate >= 90
                      ? 'bg-green-50 text-green-700'
                      : row.attendanceRate >= 75
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-red-50 text-red-700'
                  }`}
                >
                  {row.attendanceRate.toFixed(1)}%
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {row.leaveRate.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
          {leaveVsAttendanceData.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">
                No leave vs attendance data for the selected period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderReportTable = () => {
    switch (reportType) {
      case 'utilization':
        return renderUtilizationTable();
      case 'absenteeism':
        return renderAbsenteeismTable();
      case 'leave_vs_attendance':
        return renderLeaveVsAttendanceTable();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Report Type Selector */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-3">Leave Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {REPORT_TYPES.map((rt) => {
            const Icon = rt.icon;
            return (
              <button
                key={rt.value}
                type="button"
                onClick={() => {
                  setReportType(rt.value);
                  setHasGenerated(false);
                }}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  reportType === rt.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className={`h-4 w-4 ${
                      reportType === rt.value ? 'text-primary' : 'text-text-muted'
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      reportType === rt.value ? 'text-primary' : 'text-text'
                    }`}
                  >
                    {rt.label}
                  </span>
                </div>
                <p className="text-xs text-text-muted">{rt.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range + Generate */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={selectClassName}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={selectClassName}
          />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          Generate Report
        </button>
        {hasGenerated && (
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </button>
        )}
      </div>

      {/* Report Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          <span className="ml-2 text-sm text-text-muted">Generating report...</span>
        </div>
      ) : hasGenerated ? (
        renderReportTable()
      ) : (
        <div className="text-center py-12 text-text-muted">
          <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Select a report type, date range, and click &quot;Generate Report&quot; to view data.</p>
        </div>
      )}
    </div>
  );
}
