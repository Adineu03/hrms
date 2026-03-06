'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

interface Revision {
  id: string;
  title: string;
  type: string;
  fiscalYear: string;
  effectiveDate: string;
  totalBudget: number;
  status: string;
  createdAt: string;
}

const TYPES = [
  { value: 'annual', label: 'Annual' },
  { value: 'mid_year', label: 'Mid-Year' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'market_adjustment', label: 'Market Adjustment' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
};

export default function CompensationPlanningTab() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Revision | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('annual');
  const [formFiscalYear, setFormFiscalYear] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState('');
  const [formTotalBudget, setFormTotalBudget] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/compensation-rewards/admin/compensation-planning/revisions');
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setRevisions(data);
    } catch {
      setError('Failed to load compensation revisions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setFormTitle('');
    setFormType('annual');
    setFormFiscalYear('');
    setFormEffectiveDate('');
    setFormTotalBudget('');
    setShowModal(true);
  };

  const openEdit = (r: Revision) => {
    setEditing(r);
    setFormTitle(r.title);
    setFormType(r.type);
    setFormFiscalYear(r.fiscalYear);
    setFormEffectiveDate(r.effectiveDate?.slice(0, 10) || '');
    setFormTotalBudget(String(r.totalBudget || ''));
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) return;
    try {
      setSaving(true);
      setError('');
      const payload = {
        title: formTitle.trim(),
        type: formType,
        fiscalYear: formFiscalYear.trim(),
        effectiveDate: formEffectiveDate,
        totalBudget: parseFloat(formTotalBudget) || 0,
      };
      if (editing) {
        await api.patch(`/compensation-rewards/admin/compensation-planning/revisions/${editing.id}`, payload);
        setSuccess('Revision updated successfully.');
      } else {
        await api.post('/compensation-rewards/admin/compensation-planning/revisions', payload);
        setSuccess('Revision created successfully.');
      }
      setShowModal(false);
      loadData();
    } catch {
      setError('Failed to save revision.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this revision?')) return;
    try {
      setError('');
      await api.delete(`/compensation-rewards/admin/compensation-planning/revisions/${id}`);
      setSuccess('Revision deleted.');
      loadData();
    } catch {
      setError('Failed to delete revision.');
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

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
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Compensation Planning</h2>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          New Revision
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

      {revisions.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No compensation revisions yet.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Fiscal Year</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Budget</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {revisions.map((r) => (
                <tr key={r.id} className="hover:bg-background/50">
                  <td className="px-4 py-3 text-sm text-text font-medium">{r.title}</td>
                  <td className="px-4 py-3 text-sm text-text-muted capitalize">{r.type?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-sm text-text">{r.fiscalYear}</td>
                  <td className="px-4 py-3 text-sm text-text">{formatCurrency(r.totalBudget || 0)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700'}`}>
                      {r.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(r)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{editing ? 'Edit Revision' : 'New Compensation Revision'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. FY 2026-27 Annual Revision"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Fiscal Year</label>
                <input
                  type="text"
                  value={formFiscalYear}
                  onChange={(e) => setFormFiscalYear(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. 2026-27"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Effective Date</label>
                <input
                  type="date"
                  value={formEffectiveDate}
                  onChange={(e) => setFormEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Total Budget</label>
                <input
                  type="number"
                  value={formTotalBudget}
                  onChange={(e) => setFormTotalBudget(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. 5000000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving || !formTitle.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
