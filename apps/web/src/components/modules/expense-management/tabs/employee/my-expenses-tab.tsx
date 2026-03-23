'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Receipt,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Eye,
  Clock,
  XCircle,
  Send,
  Upload,
} from 'lucide-react';

interface ExpenseReport {
  id: string;
  title: string;
  description: string;
  totalAmount: number;
  itemCount: number;
  status: string;
  createdAt: string;
  submittedAt: string;
}

interface ReportDetail {
  id: string;
  title: string;
  description: string;
  totalAmount: number;
  status: string;
  createdAt: string;
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

const CATEGORY_OPTIONS = [
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

export default function MyExpensesTab() {
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create report modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [savingReport, setSavingReport] = useState(false);

  // Detail view
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Add item modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemCategory, setItemCategory] = useState('travel');
  const [itemDate, setItemDate] = useState('');
  const [itemAmount, setItemAmount] = useState(0);
  const [itemVendor, setItemVendor] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemReceipt, setItemReceipt] = useState('');
  const [savingItem, setSavingItem] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/expense-management/employee/my-expenses/reports').catch(() => ({ data: [] }));
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setReports(data);
    } catch {
      setError('Failed to load expense reports.');
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

  const handleCreateReport = async () => {
    if (!createTitle.trim()) return;
    try {
      setSavingReport(true);
      setError('');
      const res = await api.post('/expense-management/employee/my-expenses/reports', {
        title: createTitle.trim(),
        description: createDescription.trim(),
      });
      setSuccess('Expense report created successfully.');
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateDescription('');
      loadData();
      // Auto-open the newly created report
      const newId = res.data?.data?.id || res.data?.id;
      if (newId) {
        viewReportDetail(newId);
      }
    } catch {
      setError('Failed to create expense report.');
    } finally {
      setSavingReport(false);
    }
  };

  const viewReportDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      setError('');
      const res = await api.get(`/expense-management/employee/my-expenses/reports/${id}`);
      const data = res.data?.data || res.data || {};
      setSelectedReport(data);
      setShowDetailModal(true);
    } catch {
      setError('Failed to load report details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedReport || itemAmount <= 0) return;
    try {
      setSavingItem(true);
      setError('');
      await api.post(`/expense-management/employee/my-expenses/reports/${selectedReport.id}/items`, {
        category: itemCategory,
        date: itemDate,
        amount: itemAmount,
        vendor: itemVendor.trim(),
        description: itemDescription.trim(),
        receiptName: itemReceipt.trim(),
      });
      setSuccess('Expense item added.');
      setShowItemModal(false);
      resetItemForm();
      // Reload detail
      viewReportDetail(selectedReport.id);
      loadData();
    } catch {
      setError('Failed to add expense item.');
    } finally {
      setSavingItem(false);
    }
  };

  const resetItemForm = () => {
    setItemCategory('travel');
    setItemDate('');
    setItemAmount(0);
    setItemVendor('');
    setItemDescription('');
    setItemReceipt('');
  };

  const handleSubmitReport = async () => {
    if (!selectedReport) return;
    if (!confirm('Are you sure you want to submit this report for approval?')) return;
    try {
      setSubmitting(true);
      setError('');
      await api.post(`/expense-management/employee/my-expenses/reports/${selectedReport.id}/submit`);
      setSuccess('Expense report submitted for approval.');
      setShowDetailModal(false);
      loadData();
    } catch {
      setError('Failed to submit expense report.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-blue-100 text-blue-700',
      under_review: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      reimbursed: 'bg-purple-100 text-purple-700',
      returned: 'bg-orange-100 text-orange-700',
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
          <Receipt className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">My Expenses</h2>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Create Report
        </button>
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

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No expense reports yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Items</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Created</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-background/50">
                  <td className="px-4 py-3 text-sm text-text font-medium max-w-[200px] truncate">{r.title}</td>
                  <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(r.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{r.itemCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(r.status)}`}>
                      {getStatusIcon(r.status)}
                      {r.status?.replace('_', ' ') || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => viewReportDetail(r.id)}
                      disabled={loadingDetail}
                      className="p-1 text-text-muted hover:text-primary transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Create Expense Report</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Title</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. March 2026 Travel Expenses"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Optional description..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateReport} disabled={savingReport || !createTitle.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {savingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{selectedReport.title}</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-background rounded-lg p-3">
                <p className="text-xs text-text-muted mb-1">Total Amount</p>
                <p className="text-lg font-bold text-text">{formatCurrency(selectedReport.totalAmount)}</p>
              </div>
              <div className="bg-background rounded-lg p-3">
                <p className="text-xs text-text-muted mb-1">Items</p>
                <p className="text-lg font-bold text-text">{(selectedReport.items || []).length}</p>
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
              <div className="mb-4">
                <p className="text-xs text-text-muted mb-1">Description</p>
                <p className="text-sm text-text">{selectedReport.description}</p>
              </div>
            )}

            {/* Line Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-text uppercase tracking-wider">Line Items</h4>
                {(selectedReport.status === 'draft' || selectedReport.status === 'returned') && (
                  <button onClick={() => setShowItemModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </button>
                )}
              </div>
              {(selectedReport.items || []).length === 0 ? (
                <div className="text-center py-8">
                  <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
                  <p className="text-text-muted text-sm">No items added yet.</p>
                </div>
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

            {/* Total and Submit */}
            <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-text-muted">Total Amount</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(selectedReport.totalAmount)}</p>
              </div>
              {(selectedReport.status === 'draft' || selectedReport.status === 'returned') && (selectedReport.items || []).length > 0 && (
                <button
                  onClick={handleSubmitReport}
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit for Approval
                </button>
              )}
            </div>

            <div className="flex justify-end">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Add Expense Item</h3>
              <button onClick={() => { setShowItemModal(false); resetItemForm(); }} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Category</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                  >
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Date</label>
                  <input
                    type="date"
                    value={itemDate}
                    onChange={(e) => setItemDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Amount</label>
                  <input
                    type="number"
                    min={0}
                    value={itemAmount}
                    onChange={(e) => setItemAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Vendor</label>
                  <input
                    type="text"
                    value={itemVendor}
                    onChange={(e) => setItemVendor(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g. Uber, Zomato"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Describe the expense..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Receipt (placeholder)</label>
                <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white text-sm">
                  <Upload className="h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    value={itemReceipt}
                    onChange={(e) => setItemReceipt(e.target.value)}
                    className="flex-1 text-text bg-transparent outline-none"
                    placeholder="e.g. taxi-receipt-mar2026.pdf"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">File upload will be available in a future update.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowItemModal(false); resetItemForm(); }} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleAddItem} disabled={savingItem || itemAmount <= 0} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {savingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
