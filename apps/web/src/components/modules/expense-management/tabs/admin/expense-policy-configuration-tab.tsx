'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface ExpensePolicy {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  maxPerClaim: number;
  maxPerMonth: number;
  receiptRequired: boolean;
  approvalLevels: number;
  isActive: boolean;
  createdAt: string;
}

const ICON_OPTIONS = [
  { value: 'car', label: 'Car / Travel' },
  { value: 'utensils', label: 'Food / Meals' },
  { value: 'phone', label: 'Communication' },
  { value: 'briefcase', label: 'Business' },
  { value: 'home', label: 'Accommodation' },
  { value: 'monitor', label: 'Equipment' },
  { value: 'book', label: 'Training' },
  { value: 'heart', label: 'Medical' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'other', label: 'Other' },
];

export default function ExpensePolicyConfigurationTab() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [policies, setPolicies] = useState<ExpensePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catIcon, setCatIcon] = useState('other');
  const [catOrder, setCatOrder] = useState(0);
  const [savingCategory, setSavingCategory] = useState(false);

  // Policy modal
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ExpensePolicy | null>(null);
  const [polName, setPolName] = useState('');
  const [polCategoryId, setPolCategoryId] = useState('');
  const [polMaxPerClaim, setPolMaxPerClaim] = useState(0);
  const [polMaxPerMonth, setPolMaxPerMonth] = useState(0);
  const [polReceiptRequired, setPolReceiptRequired] = useState(true);
  const [polApprovalLevels, setPolApprovalLevels] = useState(1);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [catRes, polRes] = await Promise.all([
        api.get('/expense-management/admin/policy-configuration/categories'),
        api.get('/expense-management/admin/policy-configuration/policies'),
      ]);

      const catData = Array.isArray(catRes.data) ? catRes.data : catRes.data?.data || [];
      const polData = Array.isArray(polRes.data) ? polRes.data : polRes.data?.data || [];

      setCategories(catData);
      setPolicies(polData);
    } catch {
      setError('Failed to load expense policy configuration.');
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

  // Category CRUD
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDescription('');
    setCatIcon('other');
    setCatOrder(categories.length);
    setShowCategoryModal(true);
  };

  const openEditCategory = (c: ExpenseCategory) => {
    setEditingCategory(c);
    setCatName(c.name);
    setCatDescription(c.description || '');
    setCatIcon(c.icon || 'other');
    setCatOrder(c.sortOrder || 0);
    setShowCategoryModal(true);
  };

  const handleSubmitCategory = async () => {
    if (!catName.trim()) return;
    try {
      setSavingCategory(true);
      setError('');
      const payload = {
        name: catName.trim(),
        description: catDescription.trim(),
        icon: catIcon,
        sortOrder: catOrder,
      };
      if (editingCategory) {
        await api.patch(`/expense-management/admin/policy-configuration/categories/${editingCategory.id}`, payload);
        setSuccess('Expense category updated successfully.');
      } else {
        await api.post('/expense-management/admin/policy-configuration/categories', payload);
        setSuccess('Expense category created successfully.');
      }
      setShowCategoryModal(false);
      loadData();
    } catch {
      setError('Failed to save expense category.');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense category?')) return;
    try {
      setError('');
      await api.delete(`/expense-management/admin/policy-configuration/categories/${id}`);
      setSuccess('Expense category deleted.');
      loadData();
    } catch {
      setError('Failed to delete expense category.');
    }
  };

  // Policy CRUD
  const openCreatePolicy = () => {
    setEditingPolicy(null);
    setPolName('');
    setPolCategoryId(categories.length > 0 ? categories[0].id : '');
    setPolMaxPerClaim(0);
    setPolMaxPerMonth(0);
    setPolReceiptRequired(true);
    setPolApprovalLevels(1);
    setShowPolicyModal(true);
  };

  const openEditPolicy = (p: ExpensePolicy) => {
    setEditingPolicy(p);
    setPolName(p.name);
    setPolCategoryId(p.categoryId || '');
    setPolMaxPerClaim(p.maxPerClaim || 0);
    setPolMaxPerMonth(p.maxPerMonth || 0);
    setPolReceiptRequired(p.receiptRequired ?? true);
    setPolApprovalLevels(p.approvalLevels || 1);
    setShowPolicyModal(true);
  };

  const handleSubmitPolicy = async () => {
    if (!polName.trim()) return;
    try {
      setSavingPolicy(true);
      setError('');
      const payload = {
        name: polName.trim(),
        categoryId: polCategoryId,
        maxPerClaim: polMaxPerClaim,
        maxPerMonth: polMaxPerMonth,
        receiptRequired: polReceiptRequired,
        approvalLevels: polApprovalLevels,
      };
      if (editingPolicy) {
        await api.patch(`/expense-management/admin/policy-configuration/policies/${editingPolicy.id}`, payload);
        setSuccess('Expense policy updated successfully.');
      } else {
        await api.post('/expense-management/admin/policy-configuration/policies', payload);
        setSuccess('Expense policy created successfully.');
      }
      setShowPolicyModal(false);
      loadData();
    } catch {
      setError('Failed to save expense policy.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense policy?')) return;
    try {
      setError('');
      await api.delete(`/expense-management/admin/policy-configuration/policies/${id}`);
      setSuccess('Expense policy deleted.');
      loadData();
    } catch {
      setError('Failed to delete expense policy.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
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
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Expense Policy Configuration</h2>
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

      {/* Expense Categories */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Expense Categories</h3>
          <button onClick={openCreateCategory} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Category
          </button>
        </div>
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No expense categories configured yet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Icon</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Order</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-text-muted max-w-[200px] truncate">{c.description || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted capitalize">{c.icon?.replace('_', ' ') || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{c.sortOrder}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditCategory(c)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteCategory(c.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
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

      {/* Expense Policies */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Expense Policies</h3>
          <button onClick={openCreatePolicy} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Policy
          </button>
        </div>
        {policies.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No expense policies configured yet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Category</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Max / Claim</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Max / Month</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Receipt Req.</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Approvals</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {policies.map((p) => (
                  <tr key={p.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {p.categoryName || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(p.maxPerClaim)}</td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(p.maxPerMonth)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.receiptRequired ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {p.receiptRequired ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{p.approvalLevels} level{p.approvalLevels !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditPolicy(p)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeletePolicy(p.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{editingCategory ? 'Edit Expense Category' : 'Add Expense Category'}</h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Name</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. Travel & Transport"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <textarea
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Describe this category..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Icon</label>
                  <select
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                  >
                    {ICON_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    value={catOrder}
                    onChange={(e) => setCatOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmitCategory} disabled={savingCategory || !catName.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {savingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{editingPolicy ? 'Edit Expense Policy' : 'Add Expense Policy'}</h3>
              <button onClick={() => setShowPolicyModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Policy Name</label>
                <input
                  type="text"
                  value={polName}
                  onChange={(e) => setPolName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. Standard Travel Policy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Category</label>
                <select
                  value={polCategoryId}
                  onChange={(e) => setPolCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                >
                  <option value="">Select category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Max per Claim</label>
                  <input
                    type="number"
                    min={0}
                    value={polMaxPerClaim}
                    onChange={(e) => setPolMaxPerClaim(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Max per Month</label>
                  <input
                    type="number"
                    min={0}
                    value={polMaxPerMonth}
                    onChange={(e) => setPolMaxPerMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Approval Levels</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={polApprovalLevels}
                    onChange={(e) => setPolApprovalLevels(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-text">
                    <input
                      type="checkbox"
                      checked={polReceiptRequired}
                      onChange={(e) => setPolReceiptRequired(e.target.checked)}
                      className="rounded border-border"
                    />
                    Receipt Required
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowPolicyModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmitPolicy} disabled={savingPolicy || !polName.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {savingPolicy ? <Loader2 className="h-4 w-4 animate-spin" /> : editingPolicy ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
