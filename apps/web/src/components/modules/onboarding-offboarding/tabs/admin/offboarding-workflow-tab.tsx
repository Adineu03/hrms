'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface OffboardingWorkflow {
  id: string;
  name: string;
  description: string;
  exitType: string;
  clearanceDepartments: string[];
  assetChecklistItems: string[];
  settlementItems: string[];
  status: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-yellow-50 text-yellow-700',
};

const EXIT_TYPES = [
  { value: 'resignation', label: 'Resignation' },
  { value: 'termination', label: 'Termination' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'contract_end', label: 'Contract End' },
  { value: 'mutual_separation', label: 'Mutual Separation' },
];

const CLEARANCE_DEPARTMENTS = [
  'IT', 'Finance', 'HR', 'Admin', 'Security', 'Legal', 'Facilities', 'Library',
];

const defaultFormData = {
  name: '',
  description: '',
  exitType: 'resignation',
  clearanceDepartments: [] as string[],
  assetChecklistItems: '',
  settlementItems: '',
  status: 'draft',
};

export default function OffboardingWorkflowTab() {
  const [workflows, setWorkflows] = useState<OffboardingWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<OffboardingWorkflow | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/onboarding-offboarding/admin/offboarding-workflows');
      setWorkflows(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load offboarding workflows.');
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
      setError('Workflow name is required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        assetChecklistItems: formData.assetChecklistItems.split('\n').filter((s) => s.trim()),
        settlementItems: formData.settlementItems.split('\n').filter((s) => s.trim()),
      };
      if (editingWorkflow) {
        await api.patch(`/onboarding-offboarding/admin/offboarding-workflows/${editingWorkflow.id}`, payload);
        setSuccess('Offboarding workflow updated.');
      } else {
        await api.post('/onboarding-offboarding/admin/offboarding-workflows', payload);
        setSuccess('Offboarding workflow created.');
      }
      setShowCreateForm(false);
      setEditingWorkflow(null);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save workflow.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offboarding workflow?')) return;
    setError(null);
    try {
      await api.delete(`/onboarding-offboarding/admin/offboarding-workflows/${id}`);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      setSuccess('Workflow deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete workflow.');
    }
  };

  const openEdit = (wf: OffboardingWorkflow) => {
    setEditingWorkflow(wf);
    setFormData({
      name: wf.name,
      description: wf.description || '',
      exitType: wf.exitType,
      clearanceDepartments: wf.clearanceDepartments || [],
      assetChecklistItems: (wf.assetChecklistItems || []).join('\n'),
      settlementItems: (wf.settlementItems || []).join('\n'),
      status: wf.status,
    });
    setShowCreateForm(true);
  };

  const openCreate = () => {
    setEditingWorkflow(null);
    setFormData(defaultFormData);
    setShowCreateForm(true);
  };

  const toggleClearanceDept = (dept: string) => {
    setFormData((prev) => ({
      ...prev,
      clearanceDepartments: prev.clearanceDepartments.includes(dept)
        ? prev.clearanceDepartments.filter((d) => d !== dept)
        : [...prev.clearanceDepartments, dept],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading offboarding workflows...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <LogOut className="h-5 w-5" />
          Offboarding Workflow Management
        </h2>
        <p className="text-sm text-text-muted">Create and manage exit workflow templates for different separation types.</p>
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
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          New Offboarding Workflow
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Exit Type</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Clearance Depts</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {workflows.map((wf) => (
              <tr key={wf.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium">{wf.name}</td>
                <td className="px-4 py-3 text-sm text-text-muted capitalize">{wf.exitType.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(wf.clearanceDepartments || []).slice(0, 3).map((d) => (
                      <span key={d} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">{d}</span>
                    ))}
                    {(wf.clearanceDepartments || []).length > 3 && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">+{wf.clearanceDepartments.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[wf.status] || 'bg-gray-100 text-gray-600'}`}>
                    {wf.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => openEdit(wf)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(wf.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {workflows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No offboarding workflows yet. Create your first exit workflow.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingWorkflow ? 'Edit Offboarding Workflow' : 'New Offboarding Workflow'}
              </h3>
              <button type="button" onClick={() => { setShowCreateForm(false); setEditingWorkflow(null); setFormData(defaultFormData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Workflow Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClassName} placeholder="e.g. Standard Resignation Process" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Workflow description..." rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Exit Type</label>
                  <select value={formData.exitType} onChange={(e) => setFormData({ ...formData, exitType: e.target.value })} className={selectClassName}>
                    {EXIT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={selectClassName}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">Clearance Departments</label>
                <div className="flex flex-wrap gap-2">
                  {CLEARANCE_DEPARTMENTS.map((dept) => (
                    <label key={dept} className="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.clearanceDepartments.includes(dept)}
                        onChange={() => toggleClearanceDept(dept)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      {dept}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Asset Checklist Items (one per line)</label>
                <textarea value={formData.assetChecklistItems} onChange={(e) => setFormData({ ...formData, assetChecklistItems: e.target.value })} className={`${inputClassName} min-h-[80px]`} placeholder="Laptop&#10;ID Card&#10;Access Card&#10;Company Phone" rows={4} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Settlement Items (one per line)</label>
                <textarea value={formData.settlementItems} onChange={(e) => setFormData({ ...formData, settlementItems: e.target.value })} className={`${inputClassName} min-h-[80px]`} placeholder="Leave encashment&#10;Gratuity&#10;Notice pay&#10;Bonus dues" rows={4} />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
              </button>
              <button type="button" onClick={() => { setShowCreateForm(false); setEditingWorkflow(null); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
