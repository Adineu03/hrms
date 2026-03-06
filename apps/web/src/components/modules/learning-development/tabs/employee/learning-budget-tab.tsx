'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Plus,
  X,
  Inbox,
  DollarSign,
  TrendingDown,
  Clock,
  Info,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';

interface BudgetSummary {
  totalAllocation: number;
  spent: number;
  remaining: number;
  pendingReimbursements: number;
  currency: string;
  rolloverEnabled: boolean;
  rolloverAmount: number;
  fiscalYearEnd: string;
}

interface SpendItem {
  id: string;
  courseName: string;
  provider: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
}

interface ReimbursementRequest {
  id: string;
  courseName: string;
  provider: string;
  amount: number;
  justification: string;
  status: string;
  submittedAt: string;
}

const SPEND_STATUS_STYLES: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
  reimbursed: 'bg-blue-100 text-blue-700',
};

const defaultRequestForm = {
  courseName: '',
  provider: '',
  amount: 0,
  justification: '',
};

export default function LearningBudgetTab() {
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [spendHistory, setSpendHistory] = useState<SpendItem[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState(defaultRequestForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [budgetRes, spendRes, reimbRes] = await Promise.all([
        api.get('/learning-development/employee/budget'),
        api.get('/learning-development/employee/budget/spend-history'),
        api.get('/learning-development/employee/budget/reimbursements'),
      ]);
      setBudget(budgetRes.data?.data || budgetRes.data);
      setSpendHistory(Array.isArray(spendRes.data) ? spendRes.data : spendRes.data?.data || []);
      setReimbursements(Array.isArray(reimbRes.data) ? reimbRes.data : reimbRes.data?.data || []);
    } catch {
      setError('Failed to load budget data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitRequest = async () => {
    setError(null);
    if (!requestForm.courseName.trim()) {
      setError('Course name is required.');
      return;
    }
    if (!requestForm.amount || requestForm.amount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/learning-development/employee/budget/reimbursement-request', {
        ...requestForm,
        amount: Number(requestForm.amount),
      });
      setSuccess('Reimbursement request submitted successfully.');
      setShowRequestModal(false);
      setRequestForm(defaultRequestForm);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit reimbursement request.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || budget?.currency || 'USD' }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading budget data...</span>
      </div>
    );
  }

  const budgetData = budget || {
    totalAllocation: 0,
    spent: 0,
    remaining: 0,
    pendingReimbursements: 0,
    currency: 'USD',
    rolloverEnabled: false,
    rolloverAmount: 0,
    fiscalYearEnd: '',
  };

  const utilizationPercent = budgetData.totalAllocation > 0
    ? Math.round((budgetData.spent / budgetData.totalAllocation) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Learning Budget
        </h2>
        <p className="text-sm text-text-muted">Track your learning budget allocation and spending.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-blue-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Total Allocation</p>
          </div>
          <p className="text-2xl font-bold text-text">{formatCurrency(budgetData.totalAllocation)}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-orange-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Spent</p>
          </div>
          <p className="text-2xl font-bold text-text">{formatCurrency(budgetData.spent)}</p>
          <div className="mt-1">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${utilizationPercent >= 80 ? 'bg-red-500' : utilizationPercent >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">{utilizationPercent}% utilized</p>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-green-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Remaining</p>
          </div>
          <p className="text-2xl font-bold text-text">{formatCurrency(budgetData.remaining)}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-purple-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Pending Reimbursements</p>
          </div>
          <p className="text-2xl font-bold text-text">{formatCurrency(budgetData.pendingReimbursements)}</p>
        </div>
      </div>

      {/* Budget Rules */}
      <div className="bg-background border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-blue-500" />
          Budget Rules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-text-muted">
          <div>
            <span className="font-medium text-text">Rollover: </span>
            {budgetData.rolloverEnabled ? (
              <span className="text-green-600">Enabled ({formatCurrency(budgetData.rolloverAmount)} carried over)</span>
            ) : (
              <span className="text-red-600">Disabled — use it or lose it</span>
            )}
          </div>
          <div>
            <span className="font-medium text-text">Currency: </span>
            {budgetData.currency}
          </div>
          {budgetData.fiscalYearEnd && (
            <div>
              <span className="font-medium text-text">Fiscal Year End: </span>
              {new Date(budgetData.fiscalYearEnd).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">Spend History</h3>
        <button
          type="button"
          onClick={() => { setRequestForm(defaultRequestForm); setShowRequestModal(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Request External Course
        </button>
      </div>

      {/* Spend History Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Course</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Provider</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Date</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {spendHistory.map((item) => (
              <tr key={item.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium">{item.courseName}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{item.provider || '--'}</td>
                <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(item.amount, item.currency)}</td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {item.date ? new Date(item.date).toLocaleDateString() : '--'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SPEND_STATUS_STYLES[item.status] || 'bg-gray-100 text-gray-600'}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
            {spendHistory.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No spending history yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pending Reimbursement Requests */}
      {reimbursements.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text">Reimbursement Requests</h3>
          <div className="space-y-2">
            {reimbursements.map((req) => (
              <div key={req.id} className="bg-card border border-border rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-text font-medium">{req.courseName}</span>
                    <p className="text-xs text-text-muted">{req.provider} - {formatCurrency(req.amount)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SPEND_STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'}`}>
                    {req.status}
                  </span>
                </div>
                {req.justification && (
                  <p className="text-xs text-text-muted mt-1 italic">&quot;{req.justification}&quot;</p>
                )}
                <p className="text-[10px] text-text-muted mt-1">
                  Submitted: {req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : '--'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request External Course Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Request External Course</h3>
              <button type="button" onClick={() => { setShowRequestModal(false); setRequestForm(defaultRequestForm); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Course Name *</label>
                <input type="text" value={requestForm.courseName} onChange={(e) => setRequestForm({ ...requestForm, courseName: e.target.value })} className={inputClassName} placeholder="e.g. Advanced Machine Learning on Coursera" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Provider</label>
                <input type="text" value={requestForm.provider} onChange={(e) => setRequestForm({ ...requestForm, provider: e.target.value })} className={inputClassName} placeholder="e.g. Coursera, Udemy" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Amount *</label>
                <input type="number" value={requestForm.amount} onChange={(e) => setRequestForm({ ...requestForm, amount: parseFloat(e.target.value) || 0 })} className={inputClassName} min={0} step={0.01} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Justification</label>
                <textarea value={requestForm.justification} onChange={(e) => setRequestForm({ ...requestForm, justification: e.target.value })} className={`${inputClassName} min-h-[80px]`} placeholder="Why do you need this course? How will it benefit your role?" rows={3} />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSubmitRequest} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Request
              </button>
              <button type="button" onClick={() => { setShowRequestModal(false); setRequestForm(defaultRequestForm); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
