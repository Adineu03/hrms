'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ShieldAlert,
  Target,
  X,
} from 'lucide-react';

interface AvailabilityEntry {
  employeeId: string;
  employeeName: string;
  days: Record<string, 'available' | 'leave' | 'pending' | 'holiday' | 'blocked'>;
}

interface BlockedDate {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
}

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary text-sm';

const AVAILABILITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' },
  leave: { bg: 'bg-red-100', text: 'text-red-800', label: 'On Leave' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  holiday: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Holiday' },
  blocked: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Blocked' },
};

export default function LeavePlanningTab() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Block dates form
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [availRes, blockedRes] = await Promise.all([
        api.get('/leave-management/manager/planning/availability-calendar', {
          params: { month, year },
        }),
        api.get('/leave-management/manager/planning/blocked-dates'),
      ]);
      setAvailability(
        Array.isArray(availRes.data) ? availRes.data : availRes.data?.data || []
      );
      setBlockedDates(
        Array.isArray(blockedRes.data) ? blockedRes.data : blockedRes.data?.data || []
      );
    } catch {
      setError('Failed to load planning data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, year]);

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

  // Generate days of month
  const daysInMonth = useMemo(() => {
    const total = new Date(year, month, 0).getDate();
    const days: { day: number; date: string; isWeekend: boolean }[] = [];
    for (let d = 1; d <= total; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = new Date(year, month - 1, d).getDay();
      days.push({ day: d, date: dateStr, isWeekend: dow === 0 || dow === 6 });
    }
    return days;
  }, [month, year]);

  const handleBlockDates = async () => {
    if (!blockStart || !blockEnd || !blockReason.trim()) {
      setError('Please fill in all block date fields.');
      return;
    }
    setIsBlocking(true);
    setError(null);
    try {
      const res = await api.post('/leave-management/manager/planning/block-dates', {
        startDate: blockStart,
        endDate: blockEnd,
        reason: blockReason.trim(),
      });
      const newBlock = res.data?.data || res.data;
      if (newBlock?.id) {
        setBlockedDates((prev) => [...prev, newBlock]);
      }
      setSuccessMessage('Dates blocked successfully.');
      setBlockStart('');
      setBlockEnd('');
      setBlockReason('');
      setShowBlockForm(false);
      loadData(); // Refresh availability
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError('Failed to block dates.');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    setIsDeleting(id);
    setError(null);
    try {
      await api.delete(`/leave-management/manager/planning/blocked-dates/${id}`);
      setBlockedDates((prev) => prev.filter((b) => b.id !== id));
      setSuccessMessage('Blocked dates removed.');
      loadData(); // Refresh availability
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError('Failed to remove blocked dates.');
    } finally {
      setIsDeleting(null);
    }
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading leave planning data...</span>
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
        {Object.entries(AVAILABILITY_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${val.bg}`} />
            <span className="text-text-muted">{val.label}</span>
          </div>
        ))}
      </div>

      {/* Availability Grid */}
      <div className="border border-border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2 sticky left-0 bg-background z-10 min-w-[140px]">
                Employee
              </th>
              {daysInMonth.map((d) => (
                <th
                  key={d.day}
                  className={`text-center text-[10px] font-semibold uppercase tracking-wider px-0.5 py-2 min-w-[28px] ${
                    d.isWeekend ? 'text-gray-400 bg-gray-50' : 'text-text-muted'
                  }`}
                >
                  {d.day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {availability.map((emp) => (
              <tr key={emp.employeeId} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-3 py-2 text-xs text-text font-medium sticky left-0 bg-card z-10 border-r border-border">
                  {emp.employeeName}
                </td>
                {daysInMonth.map((d) => {
                  const status = emp.days[d.date] || (d.isWeekend ? 'holiday' : 'available');
                  const colors = AVAILABILITY_COLORS[status] || AVAILABILITY_COLORS.available;
                  return (
                    <td
                      key={d.day}
                      className={`text-center px-0.5 py-2 ${d.isWeekend ? 'bg-gray-50' : ''}`}
                      title={`${emp.employeeName} - ${d.date}: ${colors.label}`}
                    >
                      <span
                        className={`inline-block w-5 h-5 rounded ${colors.bg}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            {availability.length === 0 && (
              <tr>
                <td
                  colSpan={daysInMonth.length + 1}
                  className="px-4 py-8 text-center"
                >
                  <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No team availability data for this month.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Block Dates Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange-600" />
            Blocked Dates
          </h3>
          <button
            type="button"
            onClick={() => setShowBlockForm(!showBlockForm)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3 w-3" />
            Block Dates
          </button>
        </div>

        {/* Block form */}
        {showBlockForm && (
          <div className="bg-background border border-border rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-text">Block Date Range</p>
              <button
                type="button"
                onClick={() => setShowBlockForm(false)}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Start Date</label>
                <input
                  type="date"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">End Date</label>
                <input
                  type="date"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Reason</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className={inputClassName}
                  placeholder="e.g., Sprint deadline"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleBlockDates}
              disabled={isBlocking}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isBlocking && <Loader2 className="h-4 w-4 animate-spin" />}
              Block Dates
            </button>
          </div>
        )}

        {/* Blocked dates list */}
        {blockedDates.length > 0 ? (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Date Range
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Reason
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Created
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {blockedDates.map((block) => (
                  <tr key={block.id} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {new Date(block.startDate).toLocaleDateString()} -{' '}
                      {new Date(block.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{block.reason}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {new Date(block.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(block.id)}
                        disabled={isDeleting === block.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {isDeleting === block.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 bg-background rounded-lg border border-border">
            <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No blocked dates configured.</p>
          </div>
        )}
      </div>
    </div>
  );
}
