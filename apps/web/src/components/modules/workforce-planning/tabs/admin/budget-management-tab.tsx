'use client';
import { useState, useEffect } from 'react';
import { Loader2, Plus, X, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface Budget {
  id: string;
  budgetName: string;
  budgetYear: number;
  departmentId: string;
  allocatedAmount: number;
  actualAmount: number;
  projectedAmount: number;
  currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'active';
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  active: 'bg-indigo-100 text-indigo-700',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  active: 'Active',
};

export default function BudgetManagementTab() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    budgetName: '',
    budgetYear: new Date().getFullYear(),
    departmentId: '',
    allocatedAmount: 0,
    currency: 'INR',
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workforce-planning/admin/budget-management');
      setBudgets(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.budgetName || !form.departmentId) return;
    try {
      setSubmitting(true);
      await api.post('/workforce-planning/admin/budget-management', form);
      setForm({ budgetName: '', budgetYear: new Date().getFullYear(), departmentId: '', allocatedAmount: 0, currency: 'INR' });
      setShowForm(false);
      setSuccessMsg('Budget created successfully');
      fetchBudgets();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to create budget');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/workforce-planning/admin/budget-management/${id}/approve`);
      fetchBudgets();
    } catch {
      setError('Failed to approve budget');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'INR') return `₹${amount.toLocaleString('en-IN')}`;
    return `${currency} ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading budgets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Workforce Budgets</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Budget
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
            <h3 className="text-sm font-semibold text-[#2c2c2c] mb-3">New Budget</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Budget Name *</label>
                <input
                  type="text"
                  value={form.budgetName}
                  onChange={(e) => setForm({ ...form, budgetName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., FY2026 Hiring Budget"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Budget Year *</label>
                <input
                  type="number"
                  value={form.budgetYear}
                  onChange={(e) => setForm({ ...form, budgetYear: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department ID *</label>
                <input
                  type="text"
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Department ID"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Allocated Amount</label>
                <input
                  type="number"
                  value={form.allocatedAmount}
                  onChange={(e) => setForm({ ...form, allocatedAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Budget
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {budgets.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No budgets found. Create your first workforce budget.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget Name</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Allocated</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actual</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Projected</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Variance</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Currency</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {budgets.map((budget) => {
                  const variance = budget.allocatedAmount - (budget.actualAmount || 0);
                  const isOverBudget = variance < 0;
                  return (
                    <tr key={budget.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2 font-medium text-[#2c2c2c]">{budget.budgetName}</td>
                      <td className="py-3 px-2 text-gray-600">{budget.budgetYear}</td>
                      <td className="py-3 px-2 text-gray-600 text-xs font-mono">{budget.departmentId}</td>
                      <td className="py-3 px-2 text-gray-700">{formatCurrency(budget.allocatedAmount, budget.currency)}</td>
                      <td className="py-3 px-2 text-gray-700">{formatCurrency(budget.actualAmount || 0, budget.currency)}</td>
                      <td className="py-3 px-2 text-gray-700">{formatCurrency(budget.projectedAmount || 0, budget.currency)}</td>
                      <td className={`py-3 px-2 font-medium text-sm ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                        {isOverBudget ? '-' : '+'}{formatCurrency(Math.abs(variance), budget.currency)}
                      </td>
                      <td className="py-3 px-2 text-gray-600">{budget.currency}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[budget.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[budget.status] || budget.status}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {(budget.status === 'draft' || budget.status === 'pending_approval') && (
                          <button
                            onClick={() => handleApprove(budget.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
