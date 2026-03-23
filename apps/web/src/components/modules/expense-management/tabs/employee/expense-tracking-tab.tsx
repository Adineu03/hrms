'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Search,
  Loader2,
  AlertCircle,
  Inbox,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Copy,
} from 'lucide-react';

interface TrackingSummary {
  pendingAmount: number;
  approvedAmount: number;
  reimbursedAmount: number;
  rejectedAmount: number;
  totalSubmitted: number;
}

interface ExpenseHistoryItem {
  id: string;
  reportTitle: string;
  category: string;
  amount: number;
  status: string;
  submittedAt: string;
  processedAt: string;
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reimbursed', label: 'Reimbursed' },
];

const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food & Meals' },
  { value: 'communication', label: 'Communication' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'training', label: 'Training' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
];

export default function ExpenseTrackingTab() {
  const [summary, setSummary] = useState<TrackingSummary | null>(null);
  const [history, setHistory] = useState<ExpenseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [duplicating, setDuplicating] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const [summaryRes, historyRes] = await Promise.all([
        api.get('/expense-management/employee/tracking/summary').catch(() => ({ data: {} })),
        api.get(`/expense-management/employee/tracking/history${qs}`).catch(() => ({ data: [] })),
      ]);

      const summaryData = summaryRes.data?.data || summaryRes.data || {};
      const historyData = Array.isArray(historyRes.data) ? historyRes.data : historyRes.data?.data || [];

      setSummary({
        pendingAmount: summaryData.pendingAmount || 0,
        approvedAmount: summaryData.approvedAmount || 0,
        reimbursedAmount: summaryData.reimbursedAmount || 0,
        rejectedAmount: summaryData.rejectedAmount || 0,
        totalSubmitted: summaryData.totalSubmitted || 0,
      });
      setHistory(historyData);
    } catch {
      setError('Failed to load expense tracking data.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const handleDuplicateRejected = async (id: string) => {
    try {
      setDuplicating(id);
      setError('');
      await api.post(`/expense-management/employee/tracking/duplicate/${id}`);
      setSuccess('Rejected report duplicated as new draft.');
      loadData();
    } catch {
      setError('Failed to duplicate report.');
    } finally {
      setDuplicating('');
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
      <div className="flex items-center gap-2 mb-6">
        <Search className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Expense Tracking</h2>
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

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3.5 w-3.5 text-yellow-500" />
              <p className="text-sm text-text-muted">Pending</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.pendingAmount)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <p className="text-sm text-text-muted">Approved</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.approvedAmount)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-purple-500" />
              <p className="text-sm text-text-muted">Reimbursed</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.reimbursedAmount)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <p className="text-sm text-text-muted">Rejected</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(summary.rejectedAmount)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="h-4 w-4 text-text-muted" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
        >
          {CATEGORY_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Expense History */}
      {history.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No expense history found.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Report</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Category</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submitted</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Processed</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-background/50">
                  <td className="px-4 py-3 text-sm text-text font-medium max-w-[200px] truncate">{h.reportTitle}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                      {h.category?.replace('_', ' ') || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(h.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(h.status)}`}>
                      {getStatusIcon(h.status)}
                      {h.status?.replace('_', ' ') || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {h.submittedAt ? new Date(h.submittedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {h.processedAt ? new Date(h.processedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {h.status === 'rejected' && (
                      <button
                        onClick={() => handleDuplicateRejected(h.id)}
                        disabled={duplicating === h.id}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
                        title="Duplicate as new draft"
                      >
                        {duplicating === h.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
                        Resubmit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
