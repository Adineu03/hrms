'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Clock,
  Calendar,
  ArrowRightLeft,
  Plus,
  X,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface CurrentShift {
  id: string;
  name: string;
  code: string;
  type: string;
  startTime: string;
  endTime: string;
  breakTimes: string | null;
  gracePeriodMinutes: number;
  isNightShift: boolean;
  isFlexible: boolean;
}

interface ScheduleEntry {
  date: string;
  shiftName: string;
  shiftCode: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'in_progress' | 'upcoming' | 'absent';
  isToday: boolean;
}

interface SwapRequest {
  id: string;
  date: string;
  targetEmployeeName: string;
  reason: string;
  status: 'pending_partner' | 'pending_manager' | 'approved' | 'rejected';
  createdAt: string;
}

const SWAP_STATUS_STYLES: Record<string, string> = {
  pending_partner: 'bg-yellow-50 text-yellow-700',
  pending_manager: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const SWAP_STATUS_LABELS: Record<string, string> = {
  pending_partner: 'Pending Partner',
  pending_manager: 'Pending Manager',
  approved: 'Approved',
  rejected: 'Rejected',
};

const SCHEDULE_STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-50 text-green-700',
  in_progress: 'bg-blue-50 text-blue-700',
  upcoming: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-gray-100 text-gray-600',
  absent: 'bg-red-50 text-red-700',
};

export default function ShiftViewTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [currentShift, setCurrentShift] = useState<CurrentShift | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);

  // View toggle
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Swap form
  const [showSwapForm, setShowSwapForm] = useState(false);
  const [swapForm, setSwapForm] = useState({
    date: '',
    targetEmployee: '',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchShiftData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [shiftRes, scheduleRes, swapRes] = await Promise.all([
        api.get('/attendance/employee/shifts/current'),
        api.get('/attendance/employee/shifts/schedule', { params: { view: viewMode } }),
        api.get('/attendance/employee/shifts/swap-requests'),
      ]);
      setCurrentShift(shiftRes.data);
      setSchedule(Array.isArray(scheduleRes.data) ? scheduleRes.data : scheduleRes.data.data || []);
      setSwapRequests(Array.isArray(swapRes.data) ? swapRes.data : swapRes.data.data || []);
    } catch {
      setError('Failed to load shift data.');
    } finally {
      setIsLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    fetchShiftData();
  }, [fetchShiftData]);

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSubmitSwap = async () => {
    if (!swapForm.date || !swapForm.targetEmployee.trim() || !swapForm.reason.trim()) {
      setError('Please fill in all required fields for the swap request.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/attendance/employee/shifts/swap-requests', swapForm);
      setSwapForm({ date: '', targetEmployee: '', reason: '' });
      setShowSwapForm(false);
      showSuccessMessage('Shift swap request submitted successfully.');
      await fetchShiftData();
    } catch {
      setError('Failed to submit swap request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading shift information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Current Shift Info */}
      {currentShift ? (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5" />
            Current Shift
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-text-muted">Shift Name</p>
              <p className="text-sm font-semibold text-text">{currentShift.name}</p>
              <p className="text-xs text-text-muted font-mono">({currentShift.code})</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Timing</p>
              <p className="text-sm font-semibold text-text">
                {currentShift.startTime} - {currentShift.endTime}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {currentShift.isNightShift ? (
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
                    <Moon className="h-3 w-3" /> Night
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                    <Sun className="h-3 w-3" /> Day
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-text-muted">Break Times</p>
              <p className="text-sm font-medium text-text">
                {currentShift.breakTimes || 'As per policy'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Grace Period</p>
              <p className="text-sm font-medium text-text">
                {currentShift.gracePeriodMinutes} minutes
              </p>
              {currentShift.isFlexible && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 mt-1">
                  Flexible
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <Clock className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">No shift assigned currently.</p>
          <p className="text-xs text-text-muted mt-1">Contact your manager or HR for shift assignment.</p>
        </div>
      )}

      {/* Schedule View */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Shift Schedule
          </h3>
          <div className="flex items-center gap-1 bg-background rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-card text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-card text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Date
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Shift
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Start
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  End
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schedule.map((entry) => (
                <tr
                  key={entry.date}
                  className={`transition-colors ${
                    entry.isToday
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : 'bg-card hover:bg-background/50'
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    {formatDate(entry.date)}
                    {entry.isToday && (
                      <span className="ml-2 text-xs text-primary font-semibold">Today</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text">
                    {entry.shiftName}
                    <span className="text-xs text-text-muted ml-1 font-mono">({entry.shiftCode})</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{entry.startTime}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{entry.endTime}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        SCHEDULE_STATUS_STYLES[entry.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {entry.status === 'in_progress' ? 'In Progress' : entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}

              {schedule.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">
                    No schedule data available for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift Swap Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Shift Swap Requests
          </h3>
          <button
            type="button"
            onClick={() => {
              setShowSwapForm(!showSwapForm);
              setSwapForm({ date: '', targetEmployee: '', reason: '' });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Request Swap
          </button>
        </div>

        {/* Swap Request Form */}
        {showSwapForm && (
          <div className="bg-background border border-border rounded-lg p-4 space-y-4 mb-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-text">New Shift Swap Request</h4>
              <button
                type="button"
                onClick={() => setShowSwapForm(false)}
                className="p-1 rounded text-text-muted hover:text-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Date *</label>
                <input
                  type="date"
                  value={swapForm.date}
                  onChange={(e) => setSwapForm({ ...swapForm, date: e.target.value })}
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Colleague Name *</label>
                <input
                  type="text"
                  value={swapForm.targetEmployee}
                  onChange={(e) => setSwapForm({ ...swapForm, targetEmployee: e.target.value })}
                  placeholder="Enter colleague's name"
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Reason *</label>
                <input
                  type="text"
                  value={swapForm.reason}
                  onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
                  placeholder="Reason for swap"
                  className={`${inputClassName} text-sm`}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSubmitSwap}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4" />
                )}
                Submit Request
              </button>
              <button
                type="button"
                onClick={() => setShowSwapForm(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Swap Requests List */}
        {swapRequests.length > 0 ? (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Swap With
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Reason
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {swapRequests.map((req) => (
                  <tr key={req.id} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {formatDate(req.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text">
                      {req.targetEmployeeName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted max-w-[200px] truncate">
                      {req.reason}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          SWAP_STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {SWAP_STATUS_LABELS[req.status] || req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {formatDateTime(req.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <ArrowRightLeft className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">No shift swap requests yet.</p>
            <p className="text-xs text-text-muted mt-1">
              Click &quot;Request Swap&quot; to request a shift change with a colleague.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
