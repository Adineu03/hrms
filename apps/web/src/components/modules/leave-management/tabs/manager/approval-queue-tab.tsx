'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Inbox,
} from 'lucide-react';

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedOn: string;
  balanceAvailable?: number;
  balanceEntitled?: number;
}

interface LeaveHistoryEntry {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
}

interface QueueStats {
  pendingCount: number;
  approvedToday: number;
  avgApprovalTime: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

export default function ApprovalQueueTab() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    pendingCount: 0,
    approvedToday: 0,
    avgApprovalTime: '--',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Expanded history rows
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, LeaveHistoryEntry[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Action modal
  const [actionModal, setActionModal] = useState<{
    requestId: string;
    action: 'approve' | 'reject';
    employeeName: string;
  } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/leave-management/manager/approval-queue');
      const data = res.data || {};
      setRequests(Array.isArray(data) ? data : data.requests || data.data || []);
      if (data.stats) {
        setStats({
          pendingCount: data.stats.pendingCount || 0,
          approvedToday: data.stats.approvedToday || 0,
          avgApprovalTime: data.stats.avgApprovalTime || '--',
        });
      } else {
        // Calculate from requests
        const pending = (Array.isArray(data) ? data : data.requests || []).filter(
          (r: LeaveRequest) => r.status === 'pending'
        );
        setStats((prev) => ({ ...prev, pendingCount: pending.length }));
      }
    } catch {
      setError('Failed to load approval queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadHistory = async (employeeId: string, requestId: string) => {
    if (expandedId === requestId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(requestId);
    if (historyMap[employeeId]) return;

    setLoadingHistory(requestId);
    try {
      const res = await api.get(`/leave-management/manager/approval-queue/${requestId}/history`);
      const history = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setHistoryMap((prev) => ({ ...prev, [employeeId]: history }));
    } catch {
      // Silently fail for history
    } finally {
      setLoadingHistory(null);
    }
  };

  const handleAction = async (requestId: string, action: 'approve' | 'reject', comment?: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await api.patch(`/leave-management/manager/approval-queue/${requestId}/${action}`, {
        comment: comment?.trim() || undefined,
      });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: action === 'approve' ? ('approved' as const) : ('rejected' as const) }
            : r
        )
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      setStats((prev) => ({
        ...prev,
        pendingCount: Math.max(0, prev.pendingCount - 1),
        approvedToday: action === 'approve' ? prev.approvedToday + 1 : prev.approvedToday,
      }));
      setSuccessMessage(`Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setActionModal(null);
      setActionComment('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError(`Failed to ${action} leave request.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      await api.post('/leave-management/manager/approval-queue/bulk-approve', {
        requestIds: Array.from(selectedIds),
      });
      setRequests((prev) =>
        prev.map((r) =>
          selectedIds.has(r.id) ? { ...r, status: 'approved' as const } : r
        )
      );
      setStats((prev) => ({
        ...prev,
        pendingCount: Math.max(0, prev.pendingCount - selectedIds.size),
        approvedToday: prev.approvedToday + selectedIds.size,
      }));
      setSuccessMessage(`${selectedIds.size} request(s) approved successfully.`);
      setSelectedIds(new Set());
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError('Failed to bulk approve requests.');
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

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingRequests.length && pendingRequests.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRequests.map((r) => r.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading approval queue...</span>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700 uppercase tracking-wider">
              Pending
            </span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{stats.pendingCount}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 uppercase tracking-wider">
              Approved Today
            </span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.approvedToday}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">
              Avg Approval Time
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.avgApprovalTime}</p>
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
            onClick={handleBulkApprove}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Bulk Approve
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
                Leave Type
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Dates
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Days
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Reason
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Balance
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
              <>
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
                    <div className="flex items-center gap-1">
                      {req.employeeName}
                      <button
                        type="button"
                        onClick={() => loadHistory(req.employeeId, req.id)}
                        className="text-text-muted hover:text-primary ml-1"
                        title="View leave history"
                      >
                        {expandedId === req.id ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{req.leaveType}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted font-medium">{req.days}</td>
                  <td className="px-4 py-3 text-sm text-text-muted max-w-[180px] truncate" title={req.reason}>
                    {req.reason}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {req.balanceAvailable !== undefined
                      ? `${req.balanceAvailable}/${req.balanceEntitled || '--'}`
                      : '--'}
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
                          onClick={() =>
                            setActionModal({
                              requestId: req.id,
                              action: 'approve',
                              employeeName: req.employeeName,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActionModal({
                              requestId: req.id,
                              action: 'reject',
                              employeeName: req.employeeName,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted">--</span>
                    )}
                  </td>
                </tr>

                {/* Expanded Leave History */}
                {expandedId === req.id && (
                  <tr key={`${req.id}-history`} className="bg-background/30">
                    <td colSpan={9} className="px-8 py-3">
                      {loadingHistory === req.id ? (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
                          <span className="text-xs text-text-muted">Loading history...</span>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold text-text mb-2">
                            Leave History for {req.employeeName}
                          </p>
                          {(historyMap[req.employeeId] || []).length > 0 ? (
                            <div className="border border-border rounded-lg overflow-hidden">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-background border-b border-border">
                                    <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">
                                      Type
                                    </th>
                                    <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">
                                      Dates
                                    </th>
                                    <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">
                                      Days
                                    </th>
                                    <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {historyMap[req.employeeId].map((h) => (
                                    <tr key={h.id} className="bg-card">
                                      <td className="px-3 py-1.5 text-xs text-text-muted">{h.leaveType}</td>
                                      <td className="px-3 py-1.5 text-xs text-text-muted">
                                        {new Date(h.startDate).toLocaleDateString()} -{' '}
                                        {new Date(h.endDate).toLocaleDateString()}
                                      </td>
                                      <td className="px-3 py-1.5 text-xs text-text-muted">{h.days}</td>
                                      <td className="px-3 py-1.5 text-xs">
                                        <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                            STATUS_STYLES[h.status] || 'bg-gray-100 text-gray-600'
                                          }`}
                                        >
                                          {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-text-muted py-2">No previous leave history found.</p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No pending leave requests.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action Modal */}
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

            <p className="text-sm text-text-muted mb-4">
              {actionModal.action === 'approve'
                ? `Approve leave request from ${actionModal.employeeName}?`
                : `Reject leave request from ${actionModal.employeeName}?`}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-text-muted mb-1">
                Comment {actionModal.action === 'reject' ? '(recommended)' : '(optional)'}
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
                onClick={() => handleAction(actionModal.requestId, actionModal.action, actionComment)}
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
