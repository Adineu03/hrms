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
} from 'lucide-react';

type ReportType = 'attendance' | 'absenteeism' | 'punctuality' | 'shift_compliance';

interface AttendanceRow {
  employeeId: string;
  employeeName: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  wfhDays: number;
  totalHours: number;
  otHours: number;
}

interface AbsenteeismRow {
  employeeId: string;
  employeeName: string;
  absentDays: number;
  mondayAbsences: number;
  fridayAbsences: number;
  postHolidayAbsences: number;
  trend: 'up' | 'down' | 'stable';
}

interface PunctualityRow {
  employeeId: string;
  employeeName: string;
  totalDays: number;
  onTimePercent: number;
  lateDays: number;
  avgLateMinutes: number;
  score: number;
}

interface ShiftComplianceRow {
  employeeId: string;
  employeeName: string;
  assignedShifts: number;
  adherent: number;
  violations: number;
  compliancePercent: number;
}

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: 'attendance', label: 'Attendance Report', description: 'Overall attendance summary' },
  { value: 'absenteeism', label: 'Absenteeism Tracker', description: 'Absence patterns and trends' },
  { value: 'punctuality', label: 'Punctuality Scorecard', description: 'On-time arrival metrics' },
  { value: 'shift_compliance', label: 'Shift Compliance', description: 'Shift adherence analysis' },
];

const selectClassName =
  'px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm';

export default function TeamReportsTab() {
  const [reportType, setReportType] = useState<ReportType>('attendance');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [attendanceData, setAttendanceData] = useState<AttendanceRow[]>([]);
  const [absenteeismData, setAbsenteeismData] = useState<AbsenteeismRow[]>([]);
  const [punctualityData, setPunctualityData] = useState<PunctualityRow[]>([]);
  const [shiftComplianceData, setShiftComplianceData] = useState<ShiftComplianceRow[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setHasGenerated(false);
    try {
      // Backend has separate endpoints per report type
      const typeEndpointMap: Record<ReportType, string> = {
        attendance: '/attendance/manager/reports/attendance',
        absenteeism: '/attendance/manager/reports/absenteeism',
        punctuality: '/attendance/manager/reports/punctuality',
        shift_compliance: '/attendance/manager/reports/shift-compliance',
      };
      const endpoint = typeEndpointMap[reportType];
      const params: Record<string, string> = {};
      if (reportType === 'punctuality') {
        // Punctuality endpoint uses month/year params
        const sd = new Date(startDate);
        params.month = String(sd.getMonth() + 1);
        params.year = String(sd.getFullYear());
      } else {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const res = await api.get(endpoint, { params }).catch(() => ({ data: [] }));
      const raw = res.data?.data || res.data?.rows || res.data;
      const data = Array.isArray(raw) ? raw : [];

      switch (reportType) {
        case 'attendance':
          setAttendanceData(data);
          break;
        case 'absenteeism':
          setAbsenteeismData(data);
          break;
        case 'punctuality':
          setPunctualityData(data);
          break;
        case 'shift_compliance':
          setShiftComplianceData(data);
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
      // No dedicated export endpoint - generate CSV client-side from loaded data
      let csvRows: string[][] = [];
      switch (reportType) {
        case 'attendance':
          csvRows = [
            ['Employee', 'Present', 'Absent', 'Late', 'Half Days', 'WFH', 'Total Hours', 'OT Hours'],
            ...attendanceData.map((r) => [r.employeeName, String(r.presentDays), String(r.absentDays), String(r.lateDays), String(r.halfDays), String(r.wfhDays), (r.totalHours ?? 0).toFixed(1), (r.otHours ?? 0).toFixed(1)]),
          ];
          break;
        case 'absenteeism':
          csvRows = [
            ['Employee', 'Absent Days', 'Mondays', 'Fridays', 'Post-Holiday', 'Trend'],
            ...absenteeismData.map((r) => [r.employeeName, String(r.absentDays), String(r.mondayAbsences), String(r.fridayAbsences), String(r.postHolidayAbsences), r.trend]),
          ];
          break;
        case 'punctuality':
          csvRows = [
            ['Employee', 'Total Days', 'On-Time %', 'Late Days', 'Avg Late Min', 'Score'],
            ...punctualityData.map((r) => [r.employeeName, String(r.totalDays), (r.onTimePercent ?? 0).toFixed(1), String(r.lateDays), (r.avgLateMinutes ?? 0).toFixed(0), String(r.score)]),
          ];
          break;
        case 'shift_compliance':
          csvRows = [
            ['Employee', 'Assigned Shifts', 'Adherent', 'Violations', 'Compliance %'],
            ...shiftComplianceData.map((r) => [r.employeeName, String(r.assignedShifts), String(r.adherent), String(r.violations), (r.compliancePercent ?? 0).toFixed(1)]),
          ];
          break;
      }
      const csvContent = csvRows.map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report-${startDate}-${endDate}.csv`);
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

  const renderAttendanceTable = () => (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-background border-b border-border">
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Present</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Absent</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Late</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Half Days</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">WFH</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Hours</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">OT Hours</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {attendanceData.map((row) => (
            <tr key={row.employeeId} className="bg-card hover:bg-background/50 transition-colors">
              <td className="px-4 py-3 text-sm text-text font-medium">{row.employeeName}</td>
              <td className="px-4 py-3 text-sm">
                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.presentDays}</span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.absentDays}</span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.lateDays}</span>
              </td>
              <td className="px-4 py-3 text-sm text-text-muted">{row.halfDays}</td>
              <td className="px-4 py-3 text-sm text-text-muted">{row.wfhDays}</td>
              <td className="px-4 py-3 text-sm text-text-muted font-medium">{(row.totalHours ?? 0).toFixed(1)}h</td>
              <td className="px-4 py-3 text-sm text-text-muted">{(row.otHours ?? 0).toFixed(1)}h</td>
            </tr>
          ))}
          {attendanceData.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-sm text-text-muted">
                No attendance data for the selected period.
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
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Absent Days</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Mondays</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Fridays</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Post-Holiday</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {absenteeismData.map((row) => (
            <tr key={row.employeeId} className="bg-card hover:bg-background/50 transition-colors">
              <td className="px-4 py-3 text-sm text-text font-medium">{row.employeeName}</td>
              <td className="px-4 py-3 text-sm">
                <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.absentDays}</span>
              </td>
              <td className="px-4 py-3 text-sm text-text-muted">{row.mondayAbsences}</td>
              <td className="px-4 py-3 text-sm text-text-muted">{row.fridayAbsences}</td>
              <td className="px-4 py-3 text-sm text-text-muted">{row.postHolidayAbsences}</td>
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
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">
                No absenteeism data for the selected period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderPunctualityTable = () => (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-background border-b border-border">
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Days</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">On-Time %</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Late Days</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Avg Late (min)</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {punctualityData.map((row) => (
            <tr key={row.employeeId} className="bg-card hover:bg-background/50 transition-colors">
              <td className="px-4 py-3 text-sm text-text font-medium">{row.employeeName}</td>
              <td className="px-4 py-3 text-sm text-text-muted">{row.totalDays}</td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    row.onTimePercent >= 90
                      ? 'bg-green-50 text-green-700'
                      : row.onTimePercent >= 75
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-red-50 text-red-700'
                  }`}
                >
                  {(row.onTimePercent ?? 0).toFixed(1)}%
                </span>
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.lateDays}</span>
              </td>
              <td className="px-4 py-3 text-sm text-text-muted">
                {(row.avgLateMinutes ?? 0) > 0 ? `${(row.avgLateMinutes ?? 0).toFixed(0)} min` : '--'}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                    row.score >= 90
                      ? 'bg-green-50 text-green-700'
                      : row.score >= 75
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-red-50 text-red-700'
                  }`}
                >
                  {row.score}
                </span>
              </td>
            </tr>
          ))}
          {punctualityData.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">
                No punctuality data for the selected period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderShiftComplianceTable = () => (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-background border-b border-border">
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Assigned Shifts</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Adherent</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Violations</th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Compliance %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {shiftComplianceData.map((row) => (
            <tr key={row.employeeId} className="bg-card hover:bg-background/50 transition-colors">
              <td className="px-4 py-3 text-sm text-text font-medium">{row.employeeName}</td>
              <td className="px-4 py-3 text-sm text-text-muted">{row.assignedShifts}</td>
              <td className="px-4 py-3 text-sm">
                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.adherent}</span>
              </td>
              <td className="px-4 py-3 text-sm">
                {row.violations > 0 ? (
                  <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">{row.violations}</span>
                ) : (
                  <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">0</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    row.compliancePercent >= 90
                      ? 'bg-green-50 text-green-700'
                      : row.compliancePercent >= 75
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-red-50 text-red-700'
                  }`}
                >
                  {(row.compliancePercent ?? 0).toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
          {shiftComplianceData.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">
                No shift compliance data for the selected period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderReportTable = () => {
    switch (reportType) {
      case 'attendance':
        return renderAttendanceTable();
      case 'absenteeism':
        return renderAbsenteeismTable();
      case 'punctuality':
        return renderPunctualityTable();
      case 'shift_compliance':
        return renderShiftComplianceTable();
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
        <h2 className="text-lg font-semibold text-text mb-3">Team Reports</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {REPORT_TYPES.map((rt) => (
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
                <BarChart3
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
          ))}
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
