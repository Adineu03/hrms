'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface TimesheetSubmission {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string;
  totalHours: number;
  billableHours: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  entries: TimesheetEntry[];
}

interface TimesheetEntry {
  id: string;
  date: string;
  project: string;
  taskCategory: string;
  hours: number;
  description: string;
  billable: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

export default function ApprovalQueueTab() {
  const [submissions, setSubmissions] = useState<TimesheetSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Action modal
  const [actionModal, setActionModal] = useState<{
    submissionId: string;
    action: 'approve' | 'reject';
    employeeName: string;
  } | null>(null);
  const [actionComment, setActionComment] = useState('');

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/daily-work-logging/manager/approvals');
      const data = res.data;
      setSubmissions(Array.isArray(data) ? data : data?.data || []);
    } catch {
      setError('Failed to load approval queue.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (submissionId: string, action: 'approve' | 'reject', comment?: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await api.post(`/daily-work-logging/manager/approvals/${submissionId}/${action}`, {
        comment: comment?.trim() || undefined,
      });
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? { ...s, status: action === 'approve' ? ('approved' as const) : ('rejected' as const) }
            : s
        )
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(submissionId);
        return next;
      });
      setSuccess(`Timesheet ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setActionModal(null);
      setActionComment('');
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError(`Failed to ${action} timesheet.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      await api.post('/daily-work-logging/manager/approvals/bulk-approve', {
        submissionIds: Array.from(selectedIds),
      });
      setSubmissions((prev) =>
        prev.map((s) =>
          selectedIds.has(s.id) ? { ...s, status: 'approved' as const } : s
        )
      );
      setSuccess(`${selectedIds.size} timesheet(s) approved successfully.`);
      setSelectedIds(new Set());
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Failed to bulk approve timesheets.');
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

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingSubmissions.length && pendingSubmissions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingSubmissions.map((s) => s.id)));
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
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700 uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{pendingSubmissions.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Approved</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{submissions.filter((s) => s.status === 'approved').length}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-xs font-medium text-red-700 uppercase tracking-wider">Rejected</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{submissions.filter((s) => s.status === 'rejected').length}</p>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-sm font-medium text-blue-700">{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={handleBulkApprove}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            Bulk Approve
          </button>
        </div>
      )}

      {/* Submissions Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.size === pendingSubmissions.length && pendingSubmissions.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-border text-primary focus:ring-primary"
                  disabled={pendingSubmissions.length === 0}
                />
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Period</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Hours</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Billable</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {submissions.map((sub) => (
              <>
                <tr key={sub.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3">
                    {sub.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(sub.id)}
                        onChange={() => toggleSelect(sub.id)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text font-medium">{sub.employeeName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{sub.period}</td>
                  <td className="px-4 py-3 text-sm text-text font-medium">{sub.totalHours.toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm text-green-700">{sub.billableHours.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[sub.status]}`}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {sub.status === 'pending' ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setActionModal({ submissionId: sub.id, action: 'approve', employeeName: sub.employeeName })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActionModal({ submissionId: sub.id, action: 'reject', employeeName: sub.employeeName })
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
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                      className="text-text-muted hover:text-primary transition-colors"
                    >
                      {expandedId === sub.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
                {expandedId === sub.id && (
                  <tr key={`${sub.id}-entries`} className="bg-background/30">
                    <td colSpan={8} className="px-8 py-3">
                      <p className="text-xs font-semibold text-text mb-2">Timesheet Entries</p>
                      {sub.entries && sub.entries.length > 0 ? (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-background border-b border-border">
                                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Date</th>
                                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Project</th>
                                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Category</th>
                                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Hours</th>
                                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Billable</th>
                                <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {sub.entries.map((e) => (
                                <tr key={e.id} className="bg-card">
                                  <td className="px-3 py-1.5 text-xs text-text-muted">{new Date(e.date).toLocaleDateString()}</td>
                                  <td className="px-3 py-1.5 text-xs text-text font-medium">{e.project}</td>
                                  <td className="px-3 py-1.5 text-xs text-text-muted">{e.taskCategory}</td>
                                  <td className="px-3 py-1.5 text-xs text-text font-medium">{e.hours.toFixed(1)}</td>
                                  <td className="px-3 py-1.5 text-xs text-text-muted">{e.billable ? 'Yes' : 'No'}</td>
                                  <td className="px-3 py-1.5 text-xs text-text-muted truncate max-w-[200px]">{e.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted py-2">No entries available.</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No timesheet submissions in queue.</p>
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
                {actionModal.action === 'approve' ? 'Approve' : 'Reject'} Timesheet
              </h3>
              <button
                type="button"
                onClick={() => { setActionModal(null); setActionComment(''); }}
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-4">
              {actionModal.action === 'approve'
                ? `Approve timesheet from ${actionModal.employeeName}?`
                : `Reject timesheet from ${actionModal.employeeName}?`}
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-muted mb-1">
                Comment {actionModal.action === 'reject' ? '(recommended)' : '(optional)'}
              </label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                placeholder="Add a comment..."
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleAction(actionModal.submissionId, actionModal.action, actionComment)}
                disabled={isProcessing}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors ${
                  actionModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
              <button
                type="button"
                onClick={() => { setActionModal(null); setActionComment(''); }}
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
