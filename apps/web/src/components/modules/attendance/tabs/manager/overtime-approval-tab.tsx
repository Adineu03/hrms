'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Timer,
  Filter,
  MessageSquare,
  X,
} from 'lucide-react';

interface OvertimeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  type: 'pre_approved' | 'post_facto';
  estimatedHours: number;
  actualHours?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approverComment?: string;
}

interface OvertimeSummary {
  pendingCount: number;
  approvedThisMonth: number;
  totalOtHoursThisMonth: number;
}

interface MonthlyEmployeeOT {
  employeeId: string;
  employeeName: string;
  totalOtHours: number;
  approvedRequests: number;
  rejectedRequests: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  pre_approved: 'Pre-Approved',
  post_facto: 'Post-Facto',
};

const selectClassName =
  'px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm';

export default function OvertimeApprovalTab() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [summary, setSummary] = useState<OvertimeSummary>({
    pendingCount: 0,
    approvedThisMonth: 0,
    totalOtHoursThisMonth: 0,
  });
  const [monthlyOT, setMonthlyOT] = useState<MonthlyEmployeeOT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('pending');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Comment popup
  const [commentPopup, setCommentPopup] = useState<{
    requestId: string;
    action: 'approve' | 'reject';
  } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const [requestsRes, summaryRes] = await Promise.all([
        api.get('/attendance/manager/overtime', { params }),
        api.get('/attendance/manager/overtime/summary'),
      ]);

      setRequests(requestsRes.data?.requests || requestsRes.data || []);
      const summaryData = summaryRes.data;
      setSummary({
        pendingCount: summaryData?.pendingCount || 0,
        approvedThisMonth: summaryData?.approvedThisMonth || 0,
        totalOtHoursThisMonth: summaryData?.totalOtHoursThisMonth || 0,
      });
      setMonthlyOT(summaryData?.monthlyBreakdown || []);
    } catch {
      setError('Failed to load overtime data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, dateFrom, dateTo]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject', comment?: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await api.post(`/attendance/manager/overtime/${requestId}/${action}`, {
        comment: comment?.trim() || undefined,
      });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: action === 'approve' ? 'approved' : 'rejected', approverComment: comment }
            : r
        )
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      setSuccessMessage(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setCommentPopup(null);
      setActionComment('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError(`Failed to ${action} overtime request.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      await api.post(`/attendance/manager/overtime/bulk-${action}`, {
        requestIds: Array.from(selectedIds),
      });
      setRequests((prev) =>
        prev.map((r) =>
          selectedIds.has(r.id)
            ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' }
            : r
        )
      );
      setSuccessMessage(
        `${selectedIds.size} request(s) ${action === 'approve' ? 'approved' : 'rejected'}.`
      );
      setSelectedIds(new Set());
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError(`Failed to bulk ${action} requests.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pendingRequests = requests.filter((r) => r.status === 'pending');
    if (selectedIds.size === pendingRequests.length && pendingRequests.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRequests.map((r) => r.id)));
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading overtime requests...</span>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700 uppercase tracking-wider">
              Pending Requests
            </span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{summary.pendingCount}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 uppercase tracking-wider">
              Approved This Month
            </span>
          </div>
          <p className="text-2xl font-bold text-green-700">{summary.approvedThisMonth}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">
              Total OT Hours
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{summary.totalOtHoursThisMonth.toFixed(1)}h</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-text-muted" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClassName}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted">From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={selectClassName}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted">To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={selectClassName}
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={() => handleBulkAction('approve')}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            Bulk Approve
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('reject')}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            <XCircle className="h-3 w-3" />
            Bulk Reject
          </button>
        </div>
      )}

      {/* Requests Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.size === pendingRequests.length && pendingRequests.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-border text-primary focus:ring-primary"
                  disabled={pendingRequests.length === 0}
                />
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Employee
              </th>
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
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((req) => (
              <tr key={req.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3">
                  {req.status === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(req.id)}
                      onChange={() => toggleSelect(req.id)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-text font-medium">
                  {req.employeeName}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {new Date(req.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {TYPE_LABELS[req.type] || req.type}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {req.estimatedHours.toFixed(1)}h
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {req.actualHours !== undefined ? `${req.actualHours.toFixed(1)}h` : '--'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted max-w-[200px] truncate" title={req.reason}>
                  {req.reason}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_STYLES[req.status]
                    }`}
                  >
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {req.status === 'pending' ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCommentPopup({ requestId: req.id, action: 'approve' })}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommentPopup({ requestId: req.id, action: 'reject' })}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted">
                      {req.approverComment && (
                        <span className="flex items-center gap-1" title={req.approverComment}>
                          <MessageSquare className="h-3 w-3" />
                          {req.approverComment.length > 20
                            ? req.approverComment.slice(0, 20) + '...'
                            : req.approverComment}
                        </span>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No overtime requests found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Comment Popup */}
      {commentPopup && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {commentPopup.action === 'approve' ? 'Approve' : 'Reject'} Overtime Request
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCommentPopup(null);
                  setActionComment('');
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
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
                onClick={() => handleAction(commentPopup.requestId, commentPopup.action, actionComment)}
                disabled={isProcessing}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors ${
                  commentPopup.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                {commentPopup.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCommentPopup(null);
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

      {/* Monthly OT Summary */}
      {monthlyOT.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text mb-3">Monthly OT Summary per Employee</h3>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Employee
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Total OT Hours
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Approved
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Rejected
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {monthlyOT.map((emp) => (
                  <tr key={emp.employeeId} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {emp.employeeName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted font-medium">
                      {emp.totalOtHours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {emp.approvedRequests}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {emp.rejectedRequests}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
