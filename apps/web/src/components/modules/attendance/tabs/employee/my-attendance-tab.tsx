'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  X,
  CheckCircle2,
  Timer,
  Coffee,
  Sun,
  Umbrella,
  Home,
} from 'lucide-react';

interface DayAttendance {
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'late' | 'leave' | 'holiday' | 'weekend' | 'wfh' | 'not_marked';
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  overtimeMinutes: number | null;
  isToday: boolean;
}

interface DayDetail {
  date: string;
  status: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  breakMinutes: number | null;
  overtimeMinutes: number | null;
  logs: Array<{
    type: string;
    timestamp: string;
    method?: string;
    breakType?: string;
  }>;
}

interface MonthlySummary {
  presentDays: number;
  absentDays: number;
  halfDays: number;
  lateDays: number;
  wfhDays: number;
  holidays: number;
  overtimeHours: number;
  avgWorkHours: number;
}

const STATUS_STYLES: Record<string, { dot: string; bg: string; label: string }> = {
  present: { dot: 'bg-green-500', bg: 'bg-green-50', label: 'Present' },
  absent: { dot: 'bg-red-500', bg: 'bg-red-50', label: 'Absent' },
  half_day: { dot: 'bg-yellow-500', bg: 'bg-yellow-50', label: 'Half Day' },
  late: { dot: 'bg-orange-500', bg: 'bg-orange-50', label: 'Late' },
  leave: { dot: 'bg-blue-500', bg: 'bg-blue-50', label: 'On Leave' },
  holiday: { dot: 'bg-purple-500', bg: 'bg-purple-50', label: 'Holiday' },
  weekend: { dot: 'bg-gray-400', bg: 'bg-gray-50', label: 'Weekend' },
  wfh: { dot: 'bg-teal-500', bg: 'bg-teal-50', label: 'WFH' },
  not_marked: { dot: 'bg-gray-300', bg: '', label: 'Not Marked' },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTimeShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function MyAttendanceTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const [days, setDays] = useState<DayAttendance[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);

  // Day detail popup
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchMonthData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [calendarRes, summaryRes] = await Promise.all([
        api.get('/attendance/employee/my-attendance/calendar', {
          params: { month: month + 1, year },
        }).catch(() => ({ data: { days: [] } })),
        api.get('/attendance/employee/my-attendance/summary', {
          params: { month: month + 1, year },
        }).catch(() => ({ data: null })),
      ]);
      const calData = calendarRes.data || {};
      setDays(Array.isArray(calData.days) ? calData.days : Array.isArray(calData) ? calData : []);
      setSummary(summaryRes.data || null);
    } catch {
      setError('Failed to load attendance data.');
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  const goToPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    const nowDate = new Date();
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    // Don't allow navigating beyond current month
    if (nextYear > nowDate.getFullYear() || (nextYear === nowDate.getFullYear() && nextMonth > nowDate.getMonth())) {
      return;
    }
    setMonth(nextMonth);
    setYear(nextYear);
    setSelectedDate(null);
  };

  const handleDayClick = async (dateStr: string) => {
    if (selectedDate === dateStr) {
      setSelectedDate(null);
      setDayDetail(null);
      return;
    }
    setSelectedDate(dateStr);
    setIsLoadingDetail(true);
    try {
      const res = await api.get(`/attendance/employee/my-attendance/daily/${dateStr}`);
      setDayDetail(res.data);
    } catch {
      setDayDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells: (DayAttendance | null)[] = [];
  // Leading empty cells
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = days.find((day) => day.date === dateStr);
    calendarCells.push(
      dayData || {
        date: dateStr,
        status: 'not_marked',
        clockIn: null,
        clockOut: null,
        totalHours: null,
        overtimeMinutes: null,
        isToday: false,
      }
    );
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const isCurrentMonthView =
    month === now.getMonth() && year === now.getFullYear();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading attendance...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Month/Year Selector */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="p-2 rounded-lg border border-border text-text-muted hover:text-text hover:bg-background transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={goToNextMonth}
          disabled={isCurrentMonthView}
          className="p-2 rounded-lg border border-border text-text-muted hover:text-text hover:bg-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {['present', 'absent', 'half_day', 'late', 'leave', 'holiday', 'weekend', 'wfh'].map((s) => {
          const style = STATUS_STYLES[s];
          return (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
              <span className="text-text-muted">{style.label}</span>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-background border-b border-border">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider py-2.5"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7">
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[80px] border-b border-r border-border bg-gray-50/50"
                />
              );
            }

            const dayNum = new Date(cell.date).getDate();
            const style = STATUS_STYLES[cell.status] || STATUS_STYLES.not_marked;
            const isSelected = selectedDate === cell.date;
            const isFutureDay =
              new Date(cell.date) > new Date(now.getFullYear(), now.getMonth(), now.getDate());

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => !isFutureDay && handleDayClick(cell.date)}
                disabled={isFutureDay}
                className={`min-h-[80px] border-b border-r border-border p-1.5 text-left transition-colors relative ${
                  style.bg || 'bg-card'
                } ${
                  isSelected
                    ? 'ring-2 ring-primary ring-inset'
                    : ''
                } ${
                  cell.isToday
                    ? 'ring-2 ring-primary/30 ring-inset'
                    : ''
                } ${
                  isFutureDay
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-background/60 cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`text-sm font-medium ${
                      cell.isToday ? 'text-primary font-bold' : 'text-text'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {cell.status !== 'not_marked' && (
                    <div className={`w-2 h-2 rounded-full ${style.dot} mt-0.5`} />
                  )}
                </div>

                {cell.clockIn && (
                  <p className="text-[10px] text-text-muted mt-1 leading-tight">
                    {formatTimeShort(cell.clockIn)}
                  </p>
                )}
                {cell.clockOut && (
                  <p className="text-[10px] text-text-muted leading-tight">
                    {formatTimeShort(cell.clockOut)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Detail Popup */}
      {selectedDate && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-text">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h3>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(null);
                setDayDetail(null);
              }}
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-background transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
              <span className="ml-2 text-sm text-text-muted">Loading details...</span>
            </div>
          ) : dayDetail ? (
            <div className="space-y-4">
              {/* Status Badge */}
              <div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    STATUS_STYLES[dayDetail.status]?.dot === 'bg-green-500'
                      ? 'bg-green-50 text-green-700'
                      : STATUS_STYLES[dayDetail.status]?.dot === 'bg-red-500'
                      ? 'bg-red-50 text-red-700'
                      : STATUS_STYLES[dayDetail.status]?.dot === 'bg-yellow-500'
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {STATUS_STYLES[dayDetail.status]?.label || dayDetail.status}
                </span>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-background rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    Clock In
                  </div>
                  <p className="text-sm font-semibold text-text">
                    {dayDetail.clockIn ? formatTimeShort(dayDetail.clockIn) : '--'}
                  </p>
                </div>
                <div className="bg-background rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    Clock Out
                  </div>
                  <p className="text-sm font-semibold text-text">
                    {dayDetail.clockOut ? formatTimeShort(dayDetail.clockOut) : '--'}
                  </p>
                </div>
                <div className="bg-background rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                    <Timer className="h-3.5 w-3.5" />
                    Total Hours
                  </div>
                  <p className="text-sm font-semibold text-text">
                    {dayDetail.totalHours != null ? `${dayDetail.totalHours.toFixed(1)}h` : '--'}
                  </p>
                </div>
                <div className="bg-background rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                    <Coffee className="h-3.5 w-3.5" />
                    Breaks
                  </div>
                  <p className="text-sm font-semibold text-text">
                    {dayDetail.breakMinutes != null ? `${dayDetail.breakMinutes}m` : '--'}
                  </p>
                </div>
              </div>

              {/* Overtime */}
              {dayDetail.overtimeMinutes != null && dayDetail.overtimeMinutes > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  Overtime: {Math.floor(dayDetail.overtimeMinutes / 60)}h {dayDetail.overtimeMinutes % 60}m
                </div>
              )}

              {/* Activity Log */}
              {dayDetail.logs && dayDetail.logs.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-text mb-2">Activity Log</h4>
                  <div className="space-y-2">
                    {dayDetail.logs.map((log, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-background rounded-lg px-3 py-2"
                      >
                        <span className="text-sm text-text capitalize">
                          {log.type.replace(/_/g, ' ')}
                          {log.method ? ` (${log.method})` : ''}
                          {log.breakType ? ` - ${log.breakType}` : ''}
                        </span>
                        <span className="text-xs text-text-muted font-mono">
                          {formatTimeShort(log.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-4">
              No detailed data available for this date.
            </p>
          )}
        </div>
      )}

      {/* Monthly Summary Stats */}
      {summary && (
        <div>
          <h3 className="text-base font-semibold text-text mb-3">Monthly Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-text-muted mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs">Present</span>
              </div>
              <p className="text-2xl font-bold text-text">{summary.presentDays}</p>
              <p className="text-xs text-text-muted">days</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-text-muted mb-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-xs">Absent</span>
              </div>
              <p className="text-2xl font-bold text-text">{summary.absentDays}</p>
              <p className="text-xs text-text-muted">days</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-text-muted mb-2">
                <Sun className="h-4 w-4 text-yellow-500" />
                <span className="text-xs">Half Days</span>
              </div>
              <p className="text-2xl font-bold text-text">{summary.halfDays}</p>
              <p className="text-xs text-text-muted">days</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-text-muted mb-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-xs">Late Days</span>
              </div>
              <p className="text-2xl font-bold text-text">{summary.lateDays}</p>
              <p className="text-xs text-text-muted">days</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-text-muted mb-2">
                <Home className="h-4 w-4 text-teal-500" />
                <span className="text-xs">WFH Days</span>
              </div>
              <p className="text-2xl font-bold text-text">{summary.wfhDays}</p>
              <p className="text-xs text-text-muted">days</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-text-muted mb-2">
                <Umbrella className="h-4 w-4 text-purple-500" />
                <span className="text-xs">Holidays</span>
              </div>
              <p className="text-2xl font-bold text-text">{summary.holidays}</p>
              <p className="text-xs text-text-muted">days</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-text-muted mb-2">
                <Timer className="h-4 w-4 text-green-600" />
                <span className="text-xs">Overtime</span>
              </div>
              <p className="text-2xl font-bold text-text">{(summary.overtimeHours ?? 0).toFixed(1)}</p>
              <p className="text-xs text-text-muted">hours</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-text-muted mb-2">
                <CalendarDays className="h-4 w-4 text-blue-500" />
                <span className="text-xs">Avg Work</span>
              </div>
              <p className="text-2xl font-bold text-text">{(summary.avgWorkHours ?? 0).toFixed(1)}</p>
              <p className="text-xs text-text-muted">hrs/day</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
