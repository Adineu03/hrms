'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Timer,
  X,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface OvertimeStats {
  totalOTHours: number;
  pendingRequests: number;
  approved: number;
  rejected: number;
}

interface OvertimeRequest {
  id: string;
  employeeName: string;
  date: string;
  type: string;
  estimatedHours: number;
  actualHours: number | null;
  reason: string;
  status: string;
  approverComment: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

export default function OvertimeConfigTab() {
  const [stats, setStats] = useState<OvertimeStats>({
    totalOTHours: 0,
    pendingRequests: 0,
    approved: 0,
    rejected: 0,
  });
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Comment modal
  const [commentModal, setCommentModal] = useState<{
    id: string;
    action: 'approved' | 'rejected';
  } | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, requestsRes] = await Promise.all([
        api.get('/attendance/admin/overtime/summary'),
        api.get('/attendance/admin/overtime/requests'),
      ]);
      const statsData = statsRes.data?.data || statsRes.data;
      setStats({
        totalOTHours: statsData?.totalOTHours || 0,
        pendingRequests: statsData?.pendingRequests || 0,
        approved: statsData?.approved || 0,
        rejected: statsData?.rejected || 0,
      });
      setRequests(
        Array.isArray(requestsRes.data) ? requestsRes.data : requestsRes.data?.data || [],
      );
    } catch {
      setError('Failed to load overtime data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async () => {
    if (!commentModal) return;
    setError(null);
    setIsSaving(true);
    try {
      await api.patch(`/attendance/admin/overtime/requests/${commentModal.id}`, {
        status: commentModal.action,
        comment: comment.trim() || null,
      });
      setCommentModal(null);
      setComment('');
      await loadData();
    } catch {
      setError(`Failed to ${commentModal.action === 'approved' ? 'approve' : 'reject'} request.`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = !filterStatus || req.status === filterStatus;
    const matchesDateFrom = !filterDateFrom || req.date >= filterDateFrom;
    const matchesDateTo = !filterDateTo || req.date <= filterDateTo;
    return matchesStatus && matchesDateFrom && matchesDateTo;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading overtime data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Overtime Management
        </h2>
        <p className="text-sm text-text-muted">
          Monitor and manage overtime requests across the organization.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Total OT Hours (Month)</div>
          <div className="mt-1 text-2xl font-bold text-text">{stats.totalOTHours}h</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Pending</div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">{stats.pendingRequests}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Approved</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{stats.approved}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Rejected</div>
          <div className="mt-1 text-2xl font-bold text-red-600">{stats.rejected}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`${selectClassName} w-40 text-sm`}
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
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className={`${inputClassName} w-40 text-sm`}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted">To:</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className={`${inputClassName} w-40 text-sm`}
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Employee
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Date
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Type
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Est. Hours
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Actual Hours
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Reason
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-32">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRequests.map((req) => (
              <tr
                key={req.id}
                className="bg-card hover:bg-background/50 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-text font-medium">
                  {req.employeeName}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {new Date(req.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {req.type}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted text-right">
                  {req.estimatedHours}h
                </td>
                <td className="px-4 py-3 text-sm text-text-muted text-right">
                  {req.actualHours != null ? `${req.actualHours}h` : '--'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted max-w-[200px] truncate" title={req.reason}>
                  {req.reason || '--'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {req.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {req.status === 'pending' ? (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCommentModal({ id: req.id, action: 'approved' });
                          setComment('');
                        }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Approve"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCommentModal({ id: req.id, action: 'rejected' });
                          setComment('');
                        }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted">
                      {req.approverComment || '--'}
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {filteredRequests.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  {requests.length === 0
                    ? 'No overtime requests found.'
                    : 'No requests match the current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">
                {commentModal.action === 'approved' ? 'Approve' : 'Reject'} Overtime Request
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCommentModal(null);
                  setComment('');
                }}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-background transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Add a comment..."
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAction}
                disabled={isSaving}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  commentModal.action === 'approved'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : commentModal.action === 'approved' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {commentModal.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCommentModal(null);
                  setComment('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
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
