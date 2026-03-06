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
} from 'lucide-react';

interface PendingApproval {
  id: string;
  type: string;
  employeeName: string;
  employeeId: string;
  amount: number;
  description: string;
  submittedAt: string;
}

interface ApprovalHistoryItem {
  id: string;
  type: string;
  employeeName: string;
  amount: number;
  status: string;
  actionAt: string;
  remarks: string;
}

export default function PayrollApprovalsTab() {
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [pendingRes, historyRes] = await Promise.all([
        api.get('/payroll-processing/manager/approvals/pending'),
        api.get('/payroll-processing/manager/approvals/history'),
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

  const handleApproval = async (type: string, id: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(`${id}-${action}`);
      setError('');
      if (action === 'approve') {
        await api.post(`/payroll-processing/manager/approvals/approve/${type}/${id}`);
        setSuccess('Request approved successfully.');
      } else {
        await api.post(`/payroll-processing/manager/approvals/reject/${type}/${id}`);
        setSuccess('Request rejected.');
      }
      loadData();
    } catch {
      setError(`Failed to ${action} request.`);
    } finally {
      setActionLoading('');
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'rejected': return <XCircle className="h-3.5 w-3.5" />;
      case 'pending': return <Clock className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      reimbursement: 'bg-blue-100 text-blue-700',
      overtime: 'bg-orange-100 text-orange-700',
      bonus: 'bg-purple-100 text-purple-700',
      salary_revision: 'bg-indigo-100 text-indigo-700',
      tax_declaration: 'bg-teal-100 text-teal-700',
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
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
        <h2 className="text-lg font-semibold text-text">Approval Workflows</h2>
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
            <p className="text-text-muted text-sm">No pending approvals.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submitted</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pending.map((p) => (
                  <tr key={p.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getTypeBadge(p.type)}`}>
                        {p.type?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-text">{p.employeeName}</p>
                        <p className="text-xs text-text-muted">{p.employeeId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted max-w-[200px] truncate">{p.description || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproval(p.type, p.id, 'approve')}
                          disabled={actionLoading === `${p.id}-approve`}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `${p.id}-approve` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(p.type, p.id, 'reject')}
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
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getTypeBadge(h.type)}`}>
                        {h.type?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{h.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(h.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(h.status)}`}>
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
    </div>
  );
}
