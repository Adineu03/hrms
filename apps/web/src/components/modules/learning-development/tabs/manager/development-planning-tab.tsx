'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
  Target,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface IdpItem {
  id: string;
  title: string;
  description: string;
  employeeId: string;
  employeeName: string;
  learningPaths: string[];
  quarterlyCheckIn: string;
  targetDate: string;
  progress: number;
  status: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-50 text-yellow-700',
};

const defaultFormData = {
  title: '',
  description: '',
  employeeId: '',
  learningPaths: '',
  quarterlyCheckIn: '',
  targetDate: '',
  status: 'active',
};

export default function DevelopmentPlanningTab() {
  const [idps, setIdps] = useState<IdpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingIdp, setEditingIdp] = useState<IdpItem | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/learning-development/manager/development-plans').catch(() => null);
      const d = res?.data?.data ?? res?.data;
      setIdps(Array.isArray(d) ? d : []);
    } catch {
      setError('Failed to load development plans.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.title.trim()) {
      setError('Plan title is required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        learningPaths: formData.learningPaths.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (editingIdp) {
        await api.patch(`/learning-development/manager/development-plans/${editingIdp.id}`, payload);
        setSuccess('Development plan updated successfully.');
      } else {
        await api.post('/learning-development/manager/development-plans', payload);
        setSuccess('Development plan created successfully.');
      }
      setShowModal(false);
      setEditingIdp(null);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save development plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this development plan?')) return;
    setError(null);
    try {
      await api.delete(`/learning-development/manager/development-plans/${id}`);
      setIdps((prev) => prev.filter((p) => p.id !== id));
      setSuccess('Development plan deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete development plan.');
    }
  };

  const openEdit = (idp: IdpItem) => {
    setEditingIdp(idp);
    setFormData({
      title: idp.title,
      description: idp.description || '',
      employeeId: idp.employeeId || '',
      learningPaths: (idp.learningPaths || []).join(', '),
      quarterlyCheckIn: idp.quarterlyCheckIn || '',
      targetDate: idp.targetDate ? idp.targetDate.split('T')[0] : '',
      status: idp.status || 'active',
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingIdp(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading development plans...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Development Planning
        </h2>
        <p className="text-sm text-text-muted">Create and manage individual development plans for your team.</p>
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
          New Development Plan
        </button>
      </div>

      {/* IDP List */}
      {idps.length === 0 ? (
        <div className="text-center py-8">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No development plans yet. Create one for your team members.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {idps.map((idp) => (
            <div key={idp.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-background/50 transition-colors"
                onClick={() => toggleExpand(idp.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {expandedId === idp.id ? (
                    <ChevronDown className="h-4 w-4 text-text-muted flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary flex-shrink-0" />
                      <h4 className="text-sm font-semibold text-text truncate">{idp.title}</h4>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{idp.employeeName || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-all"
                        style={{ width: `${idp.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted">{idp.progress || 0}%</span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[idp.status] || 'bg-gray-100 text-gray-600'}`}>
                    {idp.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {expandedId === idp.id && (
                <div className="border-t border-border px-5 py-4 bg-background/30">
                  {idp.description && (
                    <p className="text-sm text-text-muted mb-3">{idp.description}</p>
                  )}
                  {idp.targetDate && (
                    <p className="text-xs text-text-muted mb-2">Target Date: {new Date(idp.targetDate).toLocaleDateString()}</p>
                  )}
                  {idp.learningPaths && idp.learningPaths.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-text-muted uppercase mb-1">Linked Learning Paths</p>
                      <div className="flex flex-wrap gap-1.5">
                        {idp.learningPaths.map((path, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                            {path}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {idp.quarterlyCheckIn && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-text-muted uppercase mb-1">Quarterly Check-in Notes</p>
                      <p className="text-xs text-text-muted bg-card border border-border rounded-lg px-3 py-2">{idp.quarterlyCheckIn}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEdit(idp); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(idp.id); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingIdp ? 'Edit Development Plan' : 'New Development Plan'}
              </h3>
              <button type="button" onClick={() => { setShowModal(false); setEditingIdp(null); setFormData(defaultFormData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Plan Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputClassName} placeholder="e.g. Q2 Leadership Development" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Plan description and objectives..." rows={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Employee ID</label>
                <input type="text" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} className={inputClassName} placeholder="Enter employee ID" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Linked Learning Paths (comma separated)</label>
                <input type="text" value={formData.learningPaths} onChange={(e) => setFormData({ ...formData, learningPaths: e.target.value })} className={inputClassName} placeholder="e.g. Leadership Track, Tech Lead Path" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Quarterly Check-in Template</label>
                <textarea value={formData.quarterlyCheckIn} onChange={(e) => setFormData({ ...formData, quarterlyCheckIn: e.target.value })} className={`${inputClassName} min-h-[80px]`} placeholder="1. Progress on learning goals&#10;2. Skills developed&#10;3. Challenges faced&#10;4. Next quarter focus areas" rows={4} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Target Date</label>
                  <input type="date" value={formData.targetDate} onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })} className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={selectClassName}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingIdp ? 'Update Plan' : 'Create Plan'}
              </button>
              <button type="button" onClick={() => { setShowModal(false); setEditingIdp(null); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
