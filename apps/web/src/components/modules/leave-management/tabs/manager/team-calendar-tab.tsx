'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
} from 'lucide-react';

interface CalendarEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  status: 'approved' | 'pending' | 'rejected' | 'cancelled';
  startDate: string;
  endDate: string;
  days: number;
}

interface HolidayEntry {
  date: string;
  name: string;
}

interface MonthlyCalendarData {
  leaves: CalendarEntry[];
  holidays: HolidayEntry[];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  approved: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
  pending: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
  rejected: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
  cancelled: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600' },
};

export default function TeamCalendarTab() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [calendarData, setCalendarData] = useState<MonthlyCalendarData>({ leaves: [], holidays: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick action modal
  const [actionModal, setActionModal] = useState<{
    entry: CalendarEntry;
    action: 'approve' | 'reject';
  } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/leave-management/manager/team-calendar/monthly', {
        params: { month, year },
      });
      const data = res.data || {};
      setCalendarData({
        leaves: data.leaves || data.data?.leaves || [],
        holidays: data.holidays || data.data?.holidays || [],
      });
    } catch {
      setError('Failed to load team calendar data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

  const handleQuickAction = async () => {
    if (!actionModal) return;
    setIsProcessing(true);
    setError(null);
    try {
      await api.post('/leave-management/manager/team-calendar/quick-action', {
        leaveId: actionModal.entry.id,
        action: actionModal.action,
        comment: actionComment.trim() || undefined,
      });
      setCalendarData((prev) => ({
        ...prev,
        leaves: prev.leaves.map((l) =>
          l.id === actionModal.entry.id
            ? { ...l, status: actionModal.action === 'approve' ? 'approved' : 'rejected' }
            : l
        ),
      }));
      setSuccessMessage(
        `Leave request ${actionModal.action === 'approve' ? 'approved' : 'rejected'} successfully.`
      );
      setActionModal(null);
      setActionComment('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError(`Failed to ${actionModal.action} leave request.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Build calendar grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();

    // Get day of week for first day (0=Sun, adjust to Mon=0)
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const weeks: { day: number | null; date: string }[][] = [];
    let currentWeek: { day: number | null; date: string }[] = [];

    // Fill leading empty cells
    for (let i = 0; i < startDow; i++) {
      currentWeek.push({ day: null, date: '' });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      currentWeek.push({ day: d, date: dateStr });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill trailing empty cells
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ day: null, date: '' });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [month, year]);

  // Build date -> entries map
  const dateEntriesMap = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {};
    for (const leave of calendarData.leaves) {
      if (leave.status === 'rejected' || leave.status === 'cancelled') continue;
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        if (!map[key]) map[key] = [];
        map[key].push(leave);
      }
    }
    return map;
  }, [calendarData.leaves]);

  // Build date -> holiday map
  const holidayMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const h of calendarData.holidays) {
      map[h.date] = h.name;
    }
    return map;
  }, [calendarData.holidays]);

  const isWeekend = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getDay() === 0 || d.getDay() === 6;
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading team calendar...</span>
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

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <h2 className="text-lg font-semibold text-text">
          {monthName} {year}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
          <span className="text-text-muted">Approved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
          <span className="text-text-muted">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300" />
          <span className="text-text-muted">Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
          <span className="text-text-muted">Weekend</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-background border-b border-border">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider py-2 px-1"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar weeks */}
        {calendarGrid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((cell, ci) => {
              if (cell.day === null) {
                return <div key={ci} className="min-h-[80px] bg-background/50 border-r border-border last:border-r-0" />;
              }

              const isHoliday = !!holidayMap[cell.date];
              const isWknd = isWeekend(cell.date);
              const entries = dateEntriesMap[cell.date] || [];

              let cellBg = 'bg-card';
              if (isHoliday) cellBg = 'bg-purple-50';
              else if (isWknd) cellBg = 'bg-gray-50';

              return (
                <div
                  key={ci}
                  className={`min-h-[80px] ${cellBg} border-r border-border last:border-r-0 p-1`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs font-medium ${
                        isHoliday
                          ? 'text-purple-700'
                          : isWknd
                            ? 'text-gray-400'
                            : 'text-text'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {isHoliday && (
                      <span className="text-[9px] text-purple-600 truncate max-w-[60px]" title={holidayMap[cell.date]}>
                        {holidayMap[cell.date]}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {entries.slice(0, 3).map((entry) => {
                      const colors = STATUS_COLORS[entry.status] || STATUS_COLORS.pending;
                      return (
                        <div
                          key={entry.id}
                          className={`${colors.bg} ${colors.text} border ${colors.border} rounded px-1 py-0.5 text-[10px] leading-tight truncate cursor-pointer group relative`}
                          title={`${entry.employeeName} - ${entry.leaveType} (${entry.status})`}
                        >
                          <span className="truncate block">{entry.employeeName}</span>
                          {entry.status === 'pending' && (
                            <div className="hidden group-hover:flex absolute top-full left-0 z-10 mt-0.5 gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionModal({ entry, action: 'approve' });
                                }}
                                className="px-1.5 py-0.5 bg-green-600 text-white rounded text-[9px] font-medium hover:bg-green-700"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionModal({ entry, action: 'reject' });
                                }}
                                className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-medium hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {entries.length > 3 && (
                      <span className="text-[9px] text-text-muted">
                        +{entries.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Empty state when no leaves */}
      {calendarData.leaves.length === 0 && (
        <div className="text-center py-8">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No team leave entries for this month.</p>
        </div>
      )}

      {/* Quick Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {actionModal.action === 'approve' ? 'Approve' : 'Reject'} Leave Request
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setActionComment('');
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-background rounded-lg p-3 mb-4 text-sm space-y-1">
              <p>
                <span className="font-medium text-text">Employee:</span>{' '}
                <span className="text-text-muted">{actionModal.entry.employeeName}</span>
              </p>
              <p>
                <span className="font-medium text-text">Type:</span>{' '}
                <span className="text-text-muted">{actionModal.entry.leaveType}</span>
              </p>
              <p>
                <span className="font-medium text-text">Dates:</span>{' '}
                <span className="text-text-muted">
                  {new Date(actionModal.entry.startDate).toLocaleDateString()} -{' '}
                  {new Date(actionModal.entry.endDate).toLocaleDateString()} ({actionModal.entry.days} day
                  {actionModal.entry.days !== 1 ? 's' : ''})
                </span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-text-muted mb-1">
                Comment (optional)
              </label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="Add a comment..."
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleQuickAction}
                disabled={isProcessing}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors ${
                  actionModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setActionComment('');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
