'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  X,
  Clock,
  XCircle,
  Eye,
  Filter,
} from 'lucide-react';

interface ExpenseReport {
  id: string;
  employeeName: string;
  employeeId: string;
  title: string;
  totalAmount: number;
  itemCount: number;
  status: string;
  submittedAt: string;
  processedAt: string;
  remarks: string;
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
  auditTrail: AuditEntry[];
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

interface AuditEntry {
  id: string;
  action: string;
  performedBy: string;
  performedAt: string;
  remarks: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reimbursed', label: 'Reimbursed' },
];

export default function ExpenseReportManagementTab() {
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState('');

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionRemarks, setActionRemarks] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await api.get(`/expense-management/admin/report-management/reports${params}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setReports(data);
    } catch {
      setError('Failed to load expense reports.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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
      const res = await api.get(`/expense-management/admin/report-management/reports/${id}`);
      const data = res.data?.data || res.data || {};
      setSelectedReport(data);
      setActionRemarks('');
      setShowDetailModal(true);
    } catch {
      setError('Failed to load report details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(`${id}-${action}`);
      setError('');
      await api.post(`/expense-management/admin/report-management/reports/${id}/${action}`, {
        remarks: actionRemarks.trim(),
      });
      setSuccess(`Report ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setShowDetailModal(false);
      loadData();
    } catch {
      setError(`Failed to ${action} report.`);
    } finally {
      setActionLoading('');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: 'bg-blue-100 text-blue-700',
      under_review: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      reimbursed: 'bg-purple-100 text-purple-700',
      draft: 'bg-gray-100 text-gray-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'reimbursed':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'rejected':
        return <XCircle className="h-3.5 w-3.5" />;
      case 'submitted':
      case 'under_review':
        return <Clock className="h-3.5 w-3.5" />;
      default:
        return null;
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Expense Report Management</h2>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
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

      {reports.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No expense reports found.</p>
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
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submitted</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-background/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text">{r.employeeName}</p>
                      <p className="text-xs text-text-muted">{r.employeeId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text max-w-[200px] truncate">{r.title}</td>
                  <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(r.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{r.itemCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(r.status)}`}>
                      {getStatusIcon(r.status)}
                      {r.status?.replace('_', ' ') || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewReportDetail(r.id)}
                        disabled={loadingDetail}
                        className="p-1 text-text-muted hover:text-primary transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {(r.status === 'submitted' || r.status === 'under_review') && (
                        <>
                          <button
                            onClick={() => handleAction(r.id, 'approve')}
                            disabled={actionLoading === `${r.id}-approve`}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `${r.id}-approve` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(r.id, 'reject')}
                            disabled={actionLoading === `${r.id}-reject`}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `${r.id}-reject` ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                <p className="text-xs text-text-muted mb-1">Status</p>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(selectedReport.status)}`}>
                  {getStatusIcon(selectedReport.status)}
                  {selectedReport.status?.replace('_', ' ')}
                </span>
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
              <h4 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Line Items</h4>
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
                          <td className="px-4 py-2 text-sm text-text font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Audit Trail */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Audit Trail</h4>
              {(selectedReport.auditTrail || []).length === 0 ? (
                <p className="text-sm text-text-muted">No audit entries.</p>
              ) : (
                <div className="space-y-2">
                  {selectedReport.auditTrail.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 bg-background rounded-lg p-3">
                      <div className="flex-1">
                        <p className="text-sm text-text font-medium capitalize">{entry.action?.replace('_', ' ')}</p>
                        <p className="text-xs text-text-muted">
                          by {entry.performedBy} on {entry.performedAt ? new Date(entry.performedAt).toLocaleString() : '—'}
                        </p>
                        {entry.remarks && <p className="text-xs text-text-muted mt-1">{entry.remarks}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {(selectedReport.status === 'submitted' || selectedReport.status === 'under_review') && (
              <div className="border-t border-border pt-4">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-text mb-1">Remarks</label>
                  <textarea
                    value={actionRemarks}
                    onChange={(e) => setActionRemarks(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Optional remarks..."
                  />
                </div>
                <div className="flex justify-end gap-3">
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
            )}

            {selectedReport.status !== 'submitted' && selectedReport.status !== 'under_review' && (
              <div className="flex justify-end mt-4">
                <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
