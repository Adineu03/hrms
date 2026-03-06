'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Send,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';

interface WeeklyRow {
  projectId: string;
  projectName: string;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function WeeklyTimesheetTab() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const { start } = getWeekRange(new Date());
    return start;
  });
  const [rows, setRows] = useState<WeeklyRow[]>([]);
  const [minHoursPerDay, setMinHoursPerDay] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 6);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const startStr = currentWeekStart.toISOString().split('T')[0];
      const res = await api.get(`/daily-work-logging/employee/weekly?weekStart=${startStr}`);
      const data = res.data?.data || res.data;
      if (data) {
        setRows(Array.isArray(data.rows) ? data.rows : data.rows || []);
        setMinHoursPerDay(data.minHoursPerDay || 0);
      } else {
        setRows([]);
      }
    } catch {
      setError('Failed to load weekly timesheet.');
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newStart);
  };

  const updateCell = (projectId: string, day: typeof DAYS[number], value: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.projectId === projectId ? { ...r, [day]: value } : r
      )
    );
  };

  const getDayTotal = (day: typeof DAYS[number]) =>
    rows.reduce((sum, r) => sum + r[day], 0);

  const getProjectTotal = (row: WeeklyRow) =>
    DAYS.reduce((sum, d) => sum + row[d], 0);

  const getGrandTotal = () =>
    rows.reduce((sum, r) => sum + getProjectTotal(r), 0);

  const handleCopyPreviousWeek = async () => {
    setError(null);
    setIsCopying(true);
    try {
      const startStr = currentWeekStart.toISOString().split('T')[0];
      const res = await api.post('/daily-work-logging/employee/weekly/copy-week', {
        weekStart: startStr,
      });
      const data = res.data?.data || res.data;
      if (data && Array.isArray(data.rows)) {
        setRows(data.rows);
      }
      setSuccess('Previous week copied successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to copy previous week.');
    } finally {
      setIsCopying(false);
    }
  };

  const handleSubmitWeek = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const startStr = currentWeekStart.toISOString().split('T')[0];
      await api.post('/daily-work-logging/employee/weekly/submit', {
        weekStart: startStr,
        rows,
      });
      setSuccess('Weekly timesheet submitted successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit weekly timesheet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading weekly timesheet...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Weekly Timesheet
          </h2>
          <p className="text-sm text-text-muted">Enter hours per project across the week.</p>
        </div>
        <button
          type="button"
          onClick={handleCopyPreviousWeek}
          disabled={isCopying}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background disabled:opacity-50 transition-colors"
        >
          {isCopying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
          Copy Previous Week
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Week Navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigateWeek('prev')}
          className="p-2 rounded-lg border border-border text-text-muted hover:text-text hover:bg-background transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-text">
          {formatDate(currentWeekStart)} - {formatDate(weekEnd)}
        </span>
        <button
          type="button"
          onClick={() => navigateWeek('next')}
          className="p-2 rounded-lg border border-border text-text-muted hover:text-text hover:bg-background transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekly Grid */}
      <div className="border border-border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-48">Project</th>
              {DAY_LABELS.map((label, i) => {
                const dayDate = new Date(currentWeekStart);
                dayDate.setDate(currentWeekStart.getDate() + i);
                return (
                  <th key={label} className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-2 py-3 w-20">
                    <div>{label}</div>
                    <div className="text-[10px] font-normal">{formatDate(dayDate)}</div>
                  </th>
                );
              })}
              <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-20">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.projectId} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-2 text-sm text-text font-medium">{row.projectName}</td>
                {DAYS.map((day) => (
                  <td key={day} className="px-2 py-2 text-center">
                    <input
                      type="number"
                      value={row[day] || ''}
                      onChange={(e) => updateCell(row.projectId, day, parseFloat(e.target.value) || 0)}
                      min={0}
                      step={0.25}
                      className={`${inputClassName} w-16 text-center text-xs py-1.5`}
                    />
                  </td>
                ))}
                <td className="px-4 py-2 text-center text-sm font-medium text-primary">
                  {getProjectTotal(row).toFixed(1)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-text-muted">
                  No projects assigned for this week.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-background border-t border-border">
                <td className="px-4 py-3 text-sm font-semibold text-text">Daily Total</td>
                {DAYS.map((day) => {
                  const total = getDayTotal(day);
                  const isBelow = minHoursPerDay > 0 && total < minHoursPerDay && total > 0;
                  return (
                    <td key={day} className="px-2 py-3 text-center">
                      <span className={`text-sm font-semibold ${isBelow ? 'text-red-600' : 'text-text'}`}>
                        {total.toFixed(1)}
                      </span>
                      {isBelow && (
                        <div className="w-2 h-2 bg-red-500 rounded-full mx-auto mt-1" title={`Below minimum ${minHoursPerDay}h`} />
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center text-sm font-bold text-primary">
                  {getGrandTotal().toFixed(1)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Compliance Indicator */}
      {minHoursPerDay > 0 && rows.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span>Below minimum {minHoursPerDay}h per day</span>
          <div className="w-2 h-2 bg-green-500 rounded-full ml-3" />
          <span>Meets requirement</span>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSubmitWeek}
          disabled={isSubmitting || rows.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit Week
        </button>
      </div>
    </div>
  );
}
