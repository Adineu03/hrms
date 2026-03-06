'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
  PieChart,
  TrendingDown,
  Wallet,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface BudgetAllocation {
  id: string;
  type: string;
  departmentId: string;
  departmentName: string;
  fiscalYear: string;
  totalBudget: number;
  allocated: number;
  spent: number;
  remaining: number;
  currency: string;
  rolloverEnabled: boolean;
  createdAt: string;
}

interface BudgetSummary {
  totalBudget: number;
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  currency: string;
  allocations: BudgetAllocation[];
}

const defaultFormData = {
  type: 'department',
  departmentId: '',
  fiscalYear: new Date().getFullYear().toString(),
  totalBudget: 0,
  currency: 'USD',
  rolloverEnabled: false,
};

export default function BudgetManagementTab() {
  const [data, setData] = useState<BudgetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetAllocation | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/learning-development/admin/budgets');
      const responseData = res.data?.data || res.data;
      if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
        setData(responseData);
      } else {
        const allocations = Array.isArray(responseData) ? responseData : [];
        const totalBudget = allocations.reduce((s: number, a: BudgetAllocation) => s + (a.totalBudget || 0), 0);
        const totalAllocated = allocations.reduce((s: number, a: BudgetAllocation) => s + (a.allocated || 0), 0);
        const totalSpent = allocations.reduce((s: number, a: BudgetAllocation) => s + (a.spent || 0), 0);
        setData({
          totalBudget,
          totalAllocated,
          totalSpent,
          totalRemaining: totalBudget - totalSpent,
          currency: allocations[0]?.currency || 'USD',
          allocations,
        });
      }
    } catch {
      setError('Failed to load budget data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.totalBudget || formData.totalBudget <= 0) {
      setError('Total budget must be greater than 0.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingBudget) {
        await api.patch(`/learning-development/admin/budgets/${editingBudget.id}`, formData);
        setSuccess('Budget allocation updated successfully.');
      } else {
        await api.post('/learning-development/admin/budgets', formData);
        setSuccess('Budget allocation created successfully.');
      }
      setShowModal(false);
      setEditingBudget(null);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save budget allocation.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget allocation?')) return;
    setError(null);
    try {
      await api.delete(`/learning-development/admin/budgets/${id}`);
      setSuccess('Budget allocation deleted.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete budget allocation.');
    }
  };

  const openEdit = (budget: BudgetAllocation) => {
    setEditingBudget(budget);
    setFormData({
      type: budget.type || 'department',
      departmentId: budget.departmentId || '',
      fiscalYear: budget.fiscalYear || new Date().getFullYear().toString(),
      totalBudget: budget.totalBudget || 0,
      currency: budget.currency || 'USD',
      rolloverEnabled: budget.rolloverEnabled ?? false,
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingBudget(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading budget data...</span>
      </div>
    );
  }

  const summary = data || { totalBudget: 0, totalAllocated: 0, totalSpent: 0, totalRemaining: 0, currency: 'USD', allocations: [] };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Budget Management
        </h2>
        <p className="text-sm text-text-muted">Manage learning & development budget allocations by department.</p>
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
            <p className="text-xs text-text-muted uppercase font-semibold">Total Budget</p>
          </div>
          <p className="text-2xl font-bold text-text">{formatCurrency(summary.totalBudget, summary.currency)}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="h-4 w-4 text-purple-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Allocated</p>
          </div>
          <p className="text-2xl font-bold text-text">{formatCurrency(summary.totalAllocated, summary.currency)}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-orange-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Spent</p>
          </div>
          <p className="text-2xl font-bold text-text">{formatCurrency(summary.totalSpent, summary.currency)}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-green-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Remaining</p>
          </div>
          <p className="text-2xl font-bold text-text">{formatCurrency(summary.totalRemaining, summary.currency)}</p>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Budget Allocation
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Fiscal Year</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Budget</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Spent</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Remaining</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Rollover</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {summary.allocations.map((alloc) => (
              <tr key={alloc.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text capitalize">{alloc.type}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{alloc.departmentName || '--'}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{alloc.fiscalYear}</td>
                <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(alloc.totalBudget, alloc.currency)}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{formatCurrency(alloc.spent || 0, alloc.currency)}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{formatCurrency(alloc.remaining || (alloc.totalBudget - (alloc.spent || 0)), alloc.currency)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${alloc.rolloverEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {alloc.rolloverEnabled ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => openEdit(alloc)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(alloc.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {summary.allocations.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No budget allocations yet. Create your first allocation.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingBudget ? 'Edit Budget Allocation' : 'New Budget Allocation'}
              </h3>
              <button type="button" onClick={() => { setShowModal(false); setEditingBudget(null); setFormData(defaultFormData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Allocation Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className={selectClassName}>
                  <option value="department">Department</option>
                  <option value="individual">Individual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Department ID</label>
                <input type="text" value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} className={inputClassName} placeholder="Enter department ID" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Fiscal Year</label>
                  <input type="text" value={formData.fiscalYear} onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })} className={inputClassName} placeholder="e.g. 2026" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Currency</label>
                  <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className={selectClassName}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Total Budget *</label>
                <input type="number" value={formData.totalBudget} onChange={(e) => setFormData({ ...formData, totalBudget: parseFloat(e.target.value) || 0 })} className={inputClassName} min={0} step={100} />
              </div>
              <label className="flex items-center gap-2 text-sm text-text">
                <input type="checkbox" checked={formData.rolloverEnabled} onChange={(e) => setFormData({ ...formData, rolloverEnabled: e.target.checked })} className="rounded border-border text-primary focus:ring-primary" />
                Enable budget rollover to next fiscal year
              </label>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingBudget ? 'Update Allocation' : 'Create Allocation'}
              </button>
              <button type="button" onClick={() => { setShowModal(false); setEditingBudget(null); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
