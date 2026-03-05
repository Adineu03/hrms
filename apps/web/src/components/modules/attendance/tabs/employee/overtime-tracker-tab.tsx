'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Timer,
  Plus,
  X,
  CheckCircle2,
  Clock,
  FileText,
  Gift,
  Info,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface OvertimeSummary {
  totalOtThisMonth: number;
  approvedHours: number;
  pendingRequests: number;
  compOffBalance: number;
}

interface OvertimeRequest {
  id: string;
  date: string;
  type: 'pre_approval' | 'post_facto';
  estimatedHours: number;
  actualHours: number | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerComment: string | null;
  createdAt: string;
}

interface OtPolicy {
  regularRate: string;
  weekendRate: string;
  holidayRate: string;
  maxWeeklyHours: number;
  maxMonthlyHours: number;
  eligibilityCriteria: string;
  compOffConversion: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  pre_approval: 'Pre-Approval',
  post_facto: 'Post Facto',
};

export default function OvertimeTrackerTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [summary, setSummary] = useState<OvertimeSummary | null>(null);
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [policy, setPolicy] = useState<OtPolicy | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // OT Request form
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    date: '',
    type: 'pre_approval' as 'pre_approval' | 'post_facto',
    hours: '',
    reason: '',
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, requestsRes, policyRes] = await Promise.all([
        api.get('/attendance/employee/overtime/summary'),
        api.get('/attendance/employee/overtime/requests'),
        api.get('/attendance/employee/overtime/policy'),
      ]);
      setSummary(summaryRes.data);
      setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : requestsRes.data.data || []);
      setPolicy(policyRes.data);
    } catch {
      setError('Failed to load overtime data.');
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

  const handleSubmit = async () => {
    if (!form.date || !form.hours || !form.reason.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    const hoursNum = parseFloat(form.hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setError('Please enter valid overtime hours.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/attendance/employee/overtime/requests', {
        date: form.date,
        type: form.type,
        estimatedHours: hoursNum,
        reason: form.reason,
      });
      setForm({ date: '', type: 'pre_approval', hours: '', reason: '' });
      setShowForm(false);
      showSuccessMessage('Overtime request submitted successfully.');
      await fetchData();
    } catch {
      setError('Failed to submit overtime request.');
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading overtime data...</span>
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

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-text-muted mb-2">
              <Timer className="h-4 w-4 text-blue-500" />
              <span className="text-xs">Total OT This Month</span>
            </div>
            <p className="text-2xl font-bold text-text">{summary.totalOtThisMonth.toFixed(1)}</p>
            <p className="text-xs text-text-muted">hours</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-text-muted mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs">Approved Hours</span>
            </div>
            <p className="text-2xl font-bold text-text">{summary.approvedHours.toFixed(1)}</p>
            <p className="text-xs text-text-muted">hours</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-text-muted mb-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-xs">Pending Requests</span>
            </div>
            <p className="text-2xl font-bold text-text">{summary.pendingRequests}</p>
            <p className="text-xs text-text-muted">requests</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-text-muted mb-2">
              <Gift className="h-4 w-4 text-purple-500" />
              <span className="text-xs">Comp-Off Balance</span>
            </div>
            <p className="text-2xl font-bold text-text">{summary.compOffBalance.toFixed(1)}</p>
            <p className="text-xs text-text-muted">days</p>
          </div>
        </div>
      )}

      {/* Request Overtime + Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setForm({ date: '', type: 'pre_approval', hours: '', reason: '' });
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Request Overtime
        </button>
      </div>

      {/* OT Request Form */}
      {showForm && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-text">New Overtime Request</h4>
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
              <label className="block text-xs font-medium text-text-muted mb-1">Type *</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as 'pre_approval' | 'post_facto' })
                }
                className={`${selectClassName} text-sm`}
              >
                <option value="pre_approval">Pre-Approval</option>
                <option value="post_facto">Post Facto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Estimated Hours *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                placeholder="e.g., 2.5"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Reason *</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Reason for overtime"
                className={`${inputClassName} text-sm`}
              />
            </div>
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

      {/* OT Requests Table */}
      {filteredRequests.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Date
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Est. Hours
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Actual Hours
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {TYPE_LABELS[req.type] || req.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text">{req.estimatedHours}h</td>
                  <td className="px-4 py-3 text-sm text-text">
                    {req.actualHours != null ? `${req.actualHours}h` : '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted max-w-[200px] truncate">
                    {req.reason}
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
          <FileText className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            {statusFilter === 'all'
              ? 'No overtime requests yet.'
              : `No ${statusFilter} overtime requests.`}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Click &quot;Request Overtime&quot; to submit a new request.
          </p>
        </div>
      )}

      {/* OT Policy Summary */}
      {policy && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
            <Info className="h-5 w-5" />
            Overtime Policy
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-text-muted">Regular Day Rate</p>
                <p className="text-sm font-medium text-text">{policy.regularRate}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Weekend Rate</p>
                <p className="text-sm font-medium text-text">{policy.weekendRate}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Holiday Rate</p>
                <p className="text-sm font-medium text-text">{policy.holidayRate}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-text-muted">Max Weekly Hours</p>
                <p className="text-sm font-medium text-text">{policy.maxWeeklyHours} hours</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Max Monthly Hours</p>
                <p className="text-sm font-medium text-text">{policy.maxMonthlyHours} hours</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Eligibility</p>
                <p className="text-sm font-medium text-text">{policy.eligibilityCriteria}</p>
              </div>
            </div>
          </div>

          {policy.compOffConversion && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs text-text-muted">Comp-Off Conversion</p>
              <p className="text-sm font-medium text-text">{policy.compOffConversion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
