'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
  Play,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface ReviewCycle {
  id: string;
  name: string;
  description: string;
  type: string;
  reviewTypes: string[];
  ratingScaleType: string;
  selfWeightage: number;
  managerWeightage: number;
  peerWeightage: number;
  startDate: string;
  endDate: string;
  autoNotifications: boolean;
  status: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-yellow-50 text-yellow-700',
};

const CYCLE_TYPES = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'annual', label: 'Annual' },
];

const REVIEW_TYPE_OPTIONS = [
  { value: 'self', label: 'Self-Assessment' },
  { value: 'manager', label: 'Manager Review' },
  { value: 'peer', label: 'Peer Review' },
  { value: '360', label: '360-Degree' },
];

const RATING_SCALES = [
  { value: '1-5', label: '1 to 5' },
  { value: '1-10', label: '1 to 10' },
  { value: 'descriptive', label: 'Descriptive' },
];

const defaultFormData = {
  name: '',
  description: '',
  type: 'annual',
  reviewTypes: ['self', 'manager'] as string[],
  ratingScaleType: '1-5',
  selfWeightage: 30,
  managerWeightage: 50,
  peerWeightage: 20,
  startDate: '',
  endDate: '',
  autoNotifications: true,
  status: 'draft',
};

export default function ReviewCycleTab() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCycle, setEditingCycle] = useState<ReviewCycle | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/performance-growth/admin/review-cycles');
      setCycles(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load review cycles.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.name.trim()) {
      setError('Cycle name is required.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingCycle) {
        await api.patch(`/performance-growth/admin/review-cycles/${editingCycle.id}`, formData);
        setSuccess('Review cycle updated successfully.');
      } else {
        await api.post('/performance-growth/admin/review-cycles', formData);
        setSuccess('Review cycle created successfully.');
      }
      setShowModal(false);
      setEditingCycle(null);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save review cycle.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review cycle?')) return;
    setError(null);
    try {
      await api.delete(`/performance-growth/admin/review-cycles/${id}`);
      setCycles((prev) => prev.filter((c) => c.id !== id));
      setSuccess('Review cycle deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete review cycle.');
    }
  };

  const handleLaunch = async (id: string) => {
    if (!confirm('Launch this review cycle? It will become active.')) return;
    setError(null);
    try {
      await api.patch(`/performance-growth/admin/review-cycles/${id}`, { status: 'active' });
      setSuccess('Review cycle launched successfully.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to launch review cycle.');
    }
  };

  const openEdit = (cycle: ReviewCycle) => {
    setEditingCycle(cycle);
    setFormData({
      name: cycle.name,
      description: cycle.description || '',
      type: cycle.type,
      reviewTypes: cycle.reviewTypes || ['self', 'manager'],
      ratingScaleType: cycle.ratingScaleType || '1-5',
      selfWeightage: cycle.selfWeightage || 30,
      managerWeightage: cycle.managerWeightage || 50,
      peerWeightage: cycle.peerWeightage || 20,
      startDate: cycle.startDate ? cycle.startDate.split('T')[0] : '',
      endDate: cycle.endDate ? cycle.endDate.split('T')[0] : '',
      autoNotifications: cycle.autoNotifications ?? true,
      status: cycle.status,
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingCycle(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const toggleReviewType = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      reviewTypes: prev.reviewTypes.includes(value)
        ? prev.reviewTypes.filter((t) => t !== value)
        : [...prev.reviewTypes, value],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading review cycles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Review Cycle Management
        </h2>
        <p className="text-sm text-text-muted">Create and manage performance review cycles.</p>
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

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Review Cycle
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Period</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Rating Scale</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cycles.map((cycle) => (
              <tr key={cycle.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <span className="text-sm text-text font-medium">{cycle.name}</span>
                    {cycle.description && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{cycle.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted capitalize">{cycle.type?.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {cycle.startDate ? new Date(cycle.startDate).toLocaleDateString() : '--'} - {cycle.endDate ? new Date(cycle.endDate).toLocaleDateString() : '--'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{cycle.ratingScaleType || '--'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[cycle.status] || 'bg-gray-100 text-gray-600'}`}>
                    {cycle.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {cycle.status === 'draft' && (
                      <button type="button" onClick={() => handleLaunch(cycle.id)} className="p-1 text-text-muted hover:text-green-600 transition-colors" title="Launch Cycle">
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => openEdit(cycle)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(cycle.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {cycles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No review cycles yet. Create your first cycle.</p>
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
                {editingCycle ? 'Edit Review Cycle' : 'New Review Cycle'}
              </h3>
              <button type="button" onClick={() => { setShowModal(false); setEditingCycle(null); setFormData(defaultFormData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Cycle Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClassName} placeholder="e.g. Annual Review 2026" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Cycle description..." rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Cycle Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className={selectClassName}>
                    {CYCLE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Rating Scale</label>
                  <select value={formData.ratingScaleType} onChange={(e) => setFormData({ ...formData, ratingScaleType: e.target.value })} className={selectClassName}>
                    {RATING_SCALES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Review Types</label>
                <div className="flex flex-wrap gap-2">
                  {REVIEW_TYPE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-1.5 text-sm text-text">
                      <input
                        type="checkbox"
                        checked={formData.reviewTypes.includes(opt.value)}
                        onChange={() => toggleReviewType(opt.value)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Component Weightage</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-text-muted mb-0.5">Self (%)</label>
                    <input type="number" value={formData.selfWeightage} onChange={(e) => setFormData({ ...formData, selfWeightage: parseInt(e.target.value) || 0 })} className={inputClassName} min={0} max={100} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted mb-0.5">Manager (%)</label>
                    <input type="number" value={formData.managerWeightage} onChange={(e) => setFormData({ ...formData, managerWeightage: parseInt(e.target.value) || 0 })} className={inputClassName} min={0} max={100} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted mb-0.5">Peer (%)</label>
                    <input type="number" value={formData.peerWeightage} onChange={(e) => setFormData({ ...formData, peerWeightage: parseInt(e.target.value) || 0 })} className={inputClassName} min={0} max={100} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Start Date *</label>
                  <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">End Date *</label>
                  <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className={inputClassName} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-text">
                <input type="checkbox" checked={formData.autoNotifications} onChange={(e) => setFormData({ ...formData, autoNotifications: e.target.checked })} className="rounded border-border text-primary focus:ring-primary" />
                Enable auto notifications
              </label>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={selectClassName}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingCycle ? 'Update Cycle' : 'Create Cycle'}
              </button>
              <button type="button" onClick={() => { setShowModal(false); setEditingCycle(null); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
