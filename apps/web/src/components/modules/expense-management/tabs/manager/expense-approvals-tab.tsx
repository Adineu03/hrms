'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  CheckSquare,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  X,
  Clock,
  XCircle,
  Eye,
  CornerDownLeft,
} from 'lucide-react';

interface PendingExpenseReport {
  id: string;
  employeeName: string;
  employeeId: string;
  title: string;
  totalAmount: number;
  itemCount: number;
  submittedAt: string;
}

interface ReportDetail {
  id: string;
  title: string;
  description: string;
  employeeName: string;
  totalAmount: number;
  status: string;
  submittedAt: string;
  items: ExpenseLineItem[];
}

interface ExpenseLineItem {
  id: string;
  category: string;
  date: string;
  amount: number;
  vendor: string;
  description: string;
  receiptName: string;
}

interface ApprovalHistoryItem {
  id: string;
  employeeName: string;
  title: string;
  totalAmount: number;
  status: string;
  actionAt: string;
  remarks: string;
}

export default function ExpenseApprovalsTab() {
  const [pending, setPending] = useState<PendingExpenseReport[]>([]);
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionComment, setActionComment] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [pendingRes, historyRes] = await Promise.all([
        api.get('/expense-management/manager/approvals/pending'),
        api.get('/expense-management/manager/approvals/history'),
      ]);

      const pendingData = Array.isArray(pendingRes.data) ? pendingRes.data : pendingRes.data?.data || [];
      const historyData = Array.isArray(historyRes.data) ? historyRes.data : historyRes.data?.data || [];

      setPending(pendingData);
      setHistory(historyData);
    } catch {
      setError('Failed to load approval data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const viewReportDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      setError('');
      const res = await api.get(`/expense-management/manager/approvals/reports/${id}`);
      const data = res.data?.data || res.data || {};
      setSelectedReport(data);
      setActionComment('');
      setShowDetailModal(true);
    } catch {
      setError('Failed to load report details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'return') => {
    try {
      setActionLoading(`${id}-${action}`);
      setError('');
      await api.post(`/expense-management/manager/approvals/${action}/${id}`, {
        remarks: actionComment.trim(),
      });
      const messages: Record<string, string> = {
        approve: 'Expense report approved successfully.',
        reject: 'Expense report rejected.',
        return: 'Expense report returned to employee.',
      };
      setSuccess(messages[action]);
      setShowDetailModal(false);
      loadData();
    } catch {
      setError(`Failed to ${action} expense report.`);
    } finally {
      setActionLoading('');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      returned: 'bg-orange-100 text-orange-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'rejected': return <XCircle className="h-3.5 w-3.5" />;
      case 'returned': return <CornerDownLeft className="h-3.5 w-3.5" />;
      case 'pending': return <Clock className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <CheckSquare className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Expense Approvals</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Pending Approvals */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">
          Pending Approvals ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No pending expense approvals.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Items</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submitted</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pending.map((p) => (
                  <tr key={p.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-text">{p.employeeName}</p>
                        <p className="text-xs text-text-muted">{p.employeeId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text max-w-[200px] truncate">{p.title}</td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(p.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{p.itemCount}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewReportDetail(p.id)}
                          disabled={loadingDetail}
                          className="p-1 text-text-muted hover:text-primary transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleAction(p.id, 'approve')}
                          disabled={actionLoading === `${p.id}-approve`}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `${p.id}-approve` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(p.id, 'reject')}
                          disabled={actionLoading === `${p.id}-reject`}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `${p.id}-reject` ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approval History */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Approval History</h3>
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No approval history.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{h.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-text-muted max-w-[150px] truncate">{h.title}</td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(h.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(h.status)}`}>
                        {getStatusIcon(h.status)}
                        {h.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {h.actionAt ? new Date(h.actionAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{h.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Report: {selectedReport.title}</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-background rounded-lg p-3">
                <p className="text-xs text-text-muted mb-1">Employee</p>
                <p className="text-sm font-medium text-text">{selectedReport.employeeName}</p>
              </div>
              <div className="bg-background rounded-lg p-3">
                <p className="text-xs text-text-muted mb-1">Total Amount</p>
                <p className="text-sm font-bold text-text">{formatCurrency(selectedReport.totalAmount)}</p>
              </div>
              <div className="bg-background rounded-lg p-3">
                <p className="text-xs text-text-muted mb-1">Submitted</p>
                <p className="text-sm text-text">
                  {selectedReport.submittedAt ? new Date(selectedReport.submittedAt).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>

            {selectedReport.description && (
              <div className="mb-6">
                <p className="text-xs text-text-muted mb-1">Description</p>
                <p className="text-sm text-text">{selectedReport.description}</p>
              </div>
            )}

            {/* Line Items */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Line Items ({(selectedReport.items || []).length})</h4>
              {(selectedReport.items || []).length === 0 ? (
                <p className="text-sm text-text-muted">No line items.</p>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-background">
                      <tr>
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Category</th>
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Date</th>
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Vendor</th>
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Description</th>
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Receipt</th>
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedReport.items.map((item) => (
                        <tr key={item.id} className="hover:bg-background/50">
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                              {item.category?.replace('_', ' ') || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-text-muted">
                            {item.date ? new Date(item.date).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-2 text-sm text-text">{item.vendor || '—'}</td>
                          <td className="px-4 py-2 text-sm text-text-muted max-w-[150px] truncate">{item.description || '—'}</td>
                          <td className="px-4 py-2 text-sm text-text-muted">{item.receiptName || '—'}</td>
                          <td className="px-4 py-2 text-sm text-text font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Action Section */}
            <div className="border-t border-border pt-4">
              <div className="mb-3">
                <label className="block text-sm font-medium text-text mb-1">Comment</label>
                <textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Optional comment..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handleAction(selectedReport.id, 'return')}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
                >
                  {actionLoading === `${selectedReport.id}-return` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CornerDownLeft className="h-4 w-4" />}
                  Return
                </button>
                <button
                  onClick={() => handleAction(selectedReport.id, 'reject')}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  {actionLoading === `${selectedReport.id}-reject` ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Reject
                </button>
                <button
                  onClick={() => handleAction(selectedReport.id, 'approve')}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  {actionLoading === `${selectedReport.id}-approve` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
