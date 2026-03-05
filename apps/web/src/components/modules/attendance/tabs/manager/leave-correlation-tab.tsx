'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  MailPlus,
} from 'lucide-react';

interface DayEntry {
  date: string;
  status: 'present' | 'absent' | 'on_leave' | 'holiday' | 'weekend' | 'wfh' | 'not_available';
}

interface EmployeeCorrelation {
  employeeId: string;
  employeeName: string;
  days: DayEntry[];
}

interface UnapprovedAbsence {
  employeeId: string;
  employeeName: string;
  date: string;
  status: string;
  recommendation: string;
}

interface CorrelationSummary {
  totalAbsences: number;
  withLeave: number;
  withoutLeave: number;
  compliancePercent: number;
}

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-200 text-green-800',
  absent: 'bg-red-200 text-red-800',
  on_leave: 'bg-blue-200 text-blue-800',
  holiday: 'bg-purple-200 text-purple-800',
  weekend: 'bg-gray-200 text-gray-500',
  wfh: 'bg-teal-200 text-teal-800',
  not_available: 'bg-gray-100 text-gray-400',
};

const STATUS_SHORT: Record<string, string> = {
  present: 'P',
  absent: 'A',
  on_leave: 'L',
  holiday: 'H',
  weekend: 'W',
  wfh: 'R',
  not_available: '-',
};

const LEGEND_ITEMS = [
  { status: 'present', label: 'Present', color: 'bg-green-200' },
  { status: 'absent', label: 'Absent', color: 'bg-red-200' },
  { status: 'on_leave', label: 'On Leave', color: 'bg-blue-200' },
  { status: 'holiday', label: 'Holiday', color: 'bg-purple-200' },
  { status: 'weekend', label: 'Weekend', color: 'bg-gray-200' },
  { status: 'wfh', label: 'WFH', color: 'bg-teal-200' },
];

const selectClassName =
  'px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm';

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthName(month: number): string {
  return new Date(2026, month).toLocaleString(undefined, { month: 'long' });
}

export default function LeaveCorrelationTab() {
  const [employees, setEmployees] = useState<EmployeeCorrelation[]>([]);
  const [unapproved, setUnapproved] = useState<UnapprovedAbsence[]>([]);
  const [summary, setSummary] = useState<CorrelationSummary>({
    totalAbsences: 0,
    withLeave: 0,
    withoutLeave: 0,
    compliancePercent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Month/Year selector
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Nudge state
  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const [nudgeSuccess, setNudgeSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/attendance/manager/leave-correlation', {
        params: { month: selectedMonth + 1, year: selectedYear },
      });
      const data = res.data;
      setEmployees(data.employees || data.correlation || []);
      setUnapproved(data.unapprovedAbsences || data.unapproved || []);
      setSummary(
        data.summary || {
          totalAbsences: 0,
          withLeave: 0,
          withoutLeave: 0,
          compliancePercent: 0,
        }
      );
    } catch {
      setError('Failed to load leave correlation data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleNudge = async (employeeId: string, date: string) => {
    const key = `${employeeId}-${date}`;
    setNudgingId(key);
    setError(null);
    try {
      await api.post('/attendance/manager/leave-correlation/nudge', {
        employeeId,
        date,
      });
      setNudgeSuccess(`Notification sent to employee for ${new Date(date).toLocaleDateString()}.`);
      setTimeout(() => setNudgeSuccess(null), 4000);
    } catch {
      setError('Failed to send notification.');
    } finally {
      setNudgingId(null);
    }
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading leave correlation data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {nudgeSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <MailPlus className="h-4 w-4 flex-shrink-0" />
          {nudgeSuccess}
        </div>
      )}

      {/* Month/Year Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-lg border border-border text-text hover:bg-background transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-text min-w-[160px] text-center">
            {getMonthName(selectedMonth)} {selectedYear}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-lg border border-border text-text hover:bg-background transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex flex-wrap items-center gap-4">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.status} className="flex items-center gap-1.5">
            <span className={`w-4 h-4 rounded ${item.color}`} />
            <span className="text-xs text-text-muted">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="border border-border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2 sticky left-0 bg-background z-10 min-w-[140px]">
                Employee
              </th>
              {dayNumbers.map((day) => {
                const dateObj = new Date(selectedYear, selectedMonth, day);
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                return (
                  <th
                    key={day}
                    className={`text-center text-[10px] font-semibold uppercase tracking-wider px-1 py-2 min-w-[28px] ${
                      isWeekend ? 'text-text-muted bg-gray-50' : 'text-text-muted'
                    }`}
                  >
                    {day}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map((emp) => {
              // Build a map from day number to status
              const dayMap: Record<number, string> = {};
              emp.days.forEach((d) => {
                const dayNum = new Date(d.date).getDate();
                dayMap[dayNum] = d.status;
              });
              return (
                <tr key={emp.employeeId} className="bg-card">
                  <td className="px-3 py-2 text-xs text-text font-medium sticky left-0 bg-card z-10 whitespace-nowrap">
                    {emp.employeeName}
                  </td>
                  {dayNumbers.map((day) => {
                    const status = dayMap[day] || 'not_available';
                    return (
                      <td key={day} className="px-0.5 py-2 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${
                            STATUS_COLORS[status] || STATUS_COLORS.not_available
                          }`}
                          title={`${emp.employeeName} - Day ${day}: ${status.replace(/_/g, ' ')}`}
                        >
                          {STATUS_SHORT[status] || '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr>
                <td
                  colSpan={daysInMonth + 1}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No correlation data available for this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-background rounded-lg p-4 border border-border">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            Total Absences
          </p>
          <p className="text-2xl font-bold text-text">{summary.totalAbsences}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wider mb-1">
            With Leave
          </p>
          <p className="text-2xl font-bold text-green-700">{summary.withLeave}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">
            Without Leave
          </p>
          <p className="text-2xl font-bold text-red-700">{summary.withoutLeave}</p>
        </div>
        <div
          className={`rounded-lg p-4 border ${
            summary.compliancePercent >= 90
              ? 'bg-green-50 border-green-200'
              : summary.compliancePercent >= 75
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
          }`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-wider mb-1 ${
              summary.compliancePercent >= 90
                ? 'text-green-700'
                : summary.compliancePercent >= 75
                  ? 'text-yellow-700'
                  : 'text-red-700'
            }`}
          >
            Compliance %
          </p>
          <p
            className={`text-2xl font-bold ${
              summary.compliancePercent >= 90
                ? 'text-green-700'
                : summary.compliancePercent >= 75
                  ? 'text-yellow-700'
                  : 'text-red-700'
            }`}
          >
            {summary.compliancePercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Unapproved Absences Alert */}
      {unapproved.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-semibold text-text">Unapproved Absences</h3>
            <span className="bg-red-50 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {unapproved.length}
            </span>
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Employee
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Recommendation
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {unapproved.map((item, idx) => {
                  const nudgeKey = `${item.employeeId}-${item.date}`;
                  return (
                    <tr key={`${item.employeeId}-${item.date}-${idx}`} className="bg-card hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text font-medium">
                        {item.employeeName}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {item.recommendation}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleNudge(item.employeeId, item.date)}
                          disabled={nudgingId === nudgeKey}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                        >
                          {nudgingId === nudgeKey ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <MailPlus className="h-3 w-3" />
                          )}
                          Nudge
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
