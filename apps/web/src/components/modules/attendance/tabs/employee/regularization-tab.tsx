'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  Plus,
  X,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface MissedPunch {
  date: string;
  missing: 'clock_in' | 'clock_out' | 'both';
  shiftName: string | null;
}

interface RegularizationRequest {
  id: string;
  date: string;
  punchType: 'clock_in' | 'clock_out';
  requestedTime: string;
  reason: string;
  reasonCode: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerComment: string | null;
  createdAt: string;
}

interface RegularizationPolicy {
  deadlineDays: number;
  maxPerMonth: number | null;
  requiresApproval: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const REASON_CODES = [
  { value: 'forgot_badge', label: 'Forgot Badge / ID' },
  { value: 'system_error', label: 'System / Machine Error' },
  { value: 'client_site', label: 'Working at Client Site' },
  { value: 'travel', label: 'On Business Travel' },
  { value: 'other', label: 'Other' },
];

const MISSING_LABELS: Record<string, string> = {
  clock_in: 'Clock In',
  clock_out: 'Clock Out',
  both: 'Both (Clock In & Out)',
};

export default function RegularizationTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [missedPunches, setMissedPunches] = useState<MissedPunch[]>([]);
  const [requests, setRequests] = useState<RegularizationRequest[]>([]);
  const [policy, setPolicy] = useState<RegularizationPolicy | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    date: '',
    punchType: 'clock_in' as 'clock_in' | 'clock_out',
    requestedTime: '',
    reason: '',
    reasonCode: 'forgot_badge',
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [missedRes, requestsRes, policyRes] = await Promise.all([
        api.get('/attendance/employee/regularizations/missed-punches'),
        api.get('/attendance/employee/regularizations'),
        api.get('/attendance/employee/regularizations/policy'),
      ]);
      setMissedPunches(Array.isArray(missedRes.data) ? missedRes.data : missedRes.data.data || []);
      setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : requestsRes.data.data || []);
      setPolicy(policyRes.data || null);
    } catch {
      setError('Failed to load regularization data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const openFormForMissed = (mp: MissedPunch) => {
    setForm({
      date: mp.date,
      punchType: mp.missing === 'both' ? 'clock_in' : mp.missing,
      requestedTime: '',
      reason: '',
      reasonCode: 'forgot_badge',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.date || !form.requestedTime || !form.reason.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/attendance/employee/regularizations', {
        date: form.date,
        punchType: form.punchType,
        requestedTime: form.requestedTime,
        reason: form.reason,
        reasonCode: form.reasonCode,
      });
      setForm({
        date: '',
        punchType: 'clock_in',
        requestedTime: '',
        reason: '',
        reasonCode: 'forgot_badge',
      });
      setShowForm(false);
      showSuccessMessage('Regularization request submitted successfully.');
      await fetchData();
    } catch {
      setError('Failed to submit regularization request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests =
    statusFilter === 'all'
      ? requests
      : requests.filter((r) => r.status === statusFilter);

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
        <span className="ml-2 text-sm text-text-muted">Loading regularization data...</span>
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

      {/* Deadline Info */}
      {policy && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-center gap-2">
          <Info className="h-4 w-4 flex-shrink-0" />
          <span>
            Regularizations must be submitted within <strong>{policy.deadlineDays} days</strong> of
            the missed punch.
            {policy.maxPerMonth != null && (
              <> Maximum {policy.maxPerMonth} regularizations per month.</>
            )}
          </span>
        </div>
      )}

      {/* Missed Punches Alert */}
      {missedPunches.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Missed Punches ({missedPunches.length})
          </h3>
          <p className="text-sm text-text-muted mb-4">
            The following days have missing clock-in or clock-out records. Submit a regularization to
            correct them.
          </p>

          <div className="space-y-2">
            {missedPunches.map((mp) => (
              <div
                key={mp.date}
                className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-text">{formatDate(mp.date)}</p>
                    {mp.shiftName && (
                      <p className="text-xs text-text-muted">{mp.shiftName}</p>
                    )}
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                    Missing: {MISSING_LABELS[mp.missing] || mp.missing}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openFormForMissed(mp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  Submit Regularization
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {missedPunches.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          No missed punches. All your attendance records are up to date.
        </div>
      )}

      {/* Submit Regularization Form */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Regularization Requests
          </h3>
          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setForm({
                date: '',
                punchType: 'clock_in',
                requestedTime: '',
                reason: '',
                reasonCode: 'forgot_badge',
              });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Submit Regularization
          </button>
        </div>

        {showForm && (
          <div className="bg-background border border-border rounded-lg p-4 space-y-4 mb-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-text">New Regularization Request</h4>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1 rounded text-text-muted hover:text-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Punch Type *
                </label>
                <select
                  value={form.punchType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      punchType: e.target.value as 'clock_in' | 'clock_out',
                    })
                  }
                  className={`${selectClassName} text-sm`}
                >
                  <option value="clock_in">Clock In</option>
                  <option value="clock_out">Clock Out</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Requested Time *
                </label>
                <input
                  type="time"
                  value={form.requestedTime}
                  onChange={(e) => setForm({ ...form, requestedTime: e.target.value })}
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Reason Code *
                </label>
                <select
                  value={form.reasonCode}
                  onChange={(e) => setForm({ ...form, reasonCode: e.target.value })}
                  className={`${selectClassName} text-sm`}
                >
                  {REASON_CODES.map((rc) => (
                    <option key={rc.value} value={rc.value}>
                      {rc.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Reason *</label>
              <textarea
                rows={2}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Describe why this regularization is needed"
                className={`${inputClassName} text-sm resize-none`}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Submit Request
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 mb-3">
          <label className="text-sm text-text-muted">Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${selectClassName} w-auto text-sm py-1.5`}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Requests Table */}
        {filteredRequests.length > 0 ? (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Punch Type
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Requested Time
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Reason
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Comment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {formatDate(req.date)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-1 text-text">
                        <Clock className="h-3.5 w-3.5 text-text-muted" />
                        {req.punchType === 'clock_in' ? 'Clock In' : 'Clock Out'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-mono">
                      {req.requestedTime}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted max-w-[200px]">
                      <div className="truncate">{req.reason}</div>
                      <span className="text-xs text-text-muted">
                        ({REASON_CODES.find((rc) => rc.value === req.reasonCode)?.label || req.reasonCode})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted max-w-[180px] truncate">
                      {req.reviewerComment || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <FileCheck className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">
              {statusFilter === 'all'
                ? 'No regularization requests yet.'
                : `No ${statusFilter} regularization requests.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
