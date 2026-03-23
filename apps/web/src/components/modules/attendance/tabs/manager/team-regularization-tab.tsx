'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
  X,
  History,
  AlertTriangle,
} from 'lucide-react';

interface RegularizationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  punchType: 'clock_in' | 'clock_out';
  requestedTime: string;
  reason: string;
  evidenceUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  slaDeadline?: string;
  approverComment?: string;
  processedAt?: string;
  processedBy?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const PUNCH_LABELS: Record<string, string> = {
  clock_in: 'Clock In',
  clock_out: 'Clock Out',
};

const selectClassName =
  'px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm';

function getSlaStatus(slaDeadline?: string): { label: string; className: string } {
  if (!slaDeadline) return { label: '--', className: 'text-text-muted' };
  const now = new Date();
  const deadline = new Date(slaDeadline);
  const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursLeft < 0) {
    return { label: 'Overdue', className: 'text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium' };
  }
  if (hoursLeft < 4) {
    return {
      label: `${Math.ceil(hoursLeft)}h left`,
      className: 'text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full text-xs font-medium',
    };
  }
  return {
    label: `${Math.ceil(hoursLeft)}h left`,
    className: 'text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium',
  };
}

export default function TeamRegularizationTab() {
  const [requests, setRequests] = useState<RegularizationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // View toggle: pending vs history
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Action popup
  const [actionPopup, setActionPopup] = useState<{
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
      if (viewMode === 'pending') {
        params.status = 'pending';
      } else {
        params.status = 'approved,rejected';
      }

      const res = await api.get('/attendance/manager/regularizations', { params }).catch(() => ({ data: [] }));
      const resData = res.data?.data || res.data;
      setRequests(Array.isArray(resData) ? resData : resData?.requests || []);
    } catch {
      setError('Failed to load regularization requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedIds(new Set());
  }, [viewMode]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject', comment?: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await api.patch(`/attendance/manager/regularizations/${requestId}`, {
        action,
        comment: comment?.trim() || undefined,
      });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: action === 'approve' ? 'approved' : 'rejected',
                approverComment: comment,
                processedAt: new Date().toISOString(),
              }
            : r
        )
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      setSuccessMessage(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setActionPopup(null);
      setActionComment('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError(`Failed to ${action} regularization request.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      await api.post('/attendance/manager/regularizations/bulk-action', {
        action,
        requestIds: Array.from(selectedIds),
      });
      setRequests((prev) =>
        prev.map((r) =>
          selectedIds.has(r.id)
            ? {
                ...r,
                status: action === 'approve' ? 'approved' : 'rejected',
                processedAt: new Date().toISOString(),
              }
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
    const pendingReqs = requests.filter((r) => r.status === 'pending');
    if (selectedIds.size === pendingReqs.length && pendingReqs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingReqs.map((r) => r.id)));
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading regularization requests...</span>
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

      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-text">Regularization Requests</h2>
          {viewMode === 'pending' && pendingCount > 0 && (
            <span className="bg-yellow-50 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full border border-yellow-200">
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode('pending')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'pending'
                ? 'bg-primary text-white'
                : 'bg-background text-text-muted hover:text-text'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Pending
          </button>
          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'history'
                ? 'bg-primary text-white'
                : 'bg-background text-text-muted hover:text-text'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            History
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {viewMode === 'pending' && selectedIds.size > 0 && (
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
              {viewMode === 'pending' && (
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === requests.filter((r) => r.status === 'pending').length &&
                      requests.filter((r) => r.status === 'pending').length > 0
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-border text-primary focus:ring-primary"
                    disabled={requests.filter((r) => r.status === 'pending').length === 0}
                  />
                </th>
              )}
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Employee
              </th>
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
                Evidence
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Status
              </th>
              {viewMode === 'pending' && (
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  SLA
                </th>
              )}
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                {viewMode === 'pending' ? 'Actions' : 'Audit'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((req) => {
              const sla = getSlaStatus(req.slaDeadline);
              return (
                <tr key={req.id} className="bg-card hover:bg-background/50 transition-colors">
                  {viewMode === 'pending' && (
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
                  )}
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    {req.employeeName}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {new Date(req.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {PUNCH_LABELS[req.punchType] || req.punchType}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {req.requestedTime}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted max-w-[180px] truncate" title={req.reason}>
                    {req.reason}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {req.evidenceUrl ? (
                      <a
                        href={req.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:text-primary-hover text-xs font-medium"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-text-muted">None</span>
                    )}
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
                  {viewMode === 'pending' && (
                    <td className="px-4 py-3 text-sm">
                      <span className={sla.className}>{sla.label}</span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {viewMode === 'pending' && req.status === 'pending' ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setActionPopup({ requestId: req.id, action: 'approve' })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionPopup({ requestId: req.id, action: 'reject' })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-text-muted space-y-0.5">
                        {req.processedAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(req.processedAt).toLocaleDateString()}
                          </div>
                        )}
                        {req.processedBy && (
                          <div>By: {req.processedBy}</div>
                        )}
                        {req.approverComment && (
                          <div className="italic" title={req.approverComment}>
                            &quot;{req.approverComment.length > 30
                              ? req.approverComment.slice(0, 30) + '...'
                              : req.approverComment}&quot;
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td
                  colSpan={viewMode === 'pending' ? 10 : 9}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  {viewMode === 'pending'
                    ? 'No pending regularization requests.'
                    : 'No regularization history found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SLA Legend */}
      {viewMode === 'pending' && (
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span className="font-medium">SLA Indicators:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Within SLA
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Approaching deadline
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-red-600" />
            Overdue
          </span>
        </div>
      )}

      {/* Action Popup */}
      {actionPopup && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {actionPopup.action === 'approve' ? 'Approve' : 'Reject'} Regularization Request
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActionPopup(null);
                  setActionComment('');
                }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-muted mb-1">
                Comment
              </label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="Add your review comment..."
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleAction(actionPopup.requestId, actionPopup.action, actionComment)}
                disabled={isProcessing}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors ${
                  actionPopup.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionPopup.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionPopup(null);
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
