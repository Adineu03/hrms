'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  GitBranch,
  X,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface WorkflowLevel {
  level: number;
  approverType: string;
}

interface Workflow {
  id: string;
  name: string;
  levels: WorkflowLevel[];
  applicableLeaveTypes: string[];
  applicableDepartments: string[];
  minDaysForMultiLevel: number;
  isActive: boolean;
}

interface WorkflowFormData {
  name: string;
  levels: WorkflowLevel[];
  applicableLeaveTypes: string;
  applicableDepartments: string;
  minDaysForMultiLevel: number;
  isActive: boolean;
}

const APPROVER_TYPES = [
  { value: 'reporting_manager', label: 'Reporting Manager' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'hr_admin', label: 'HR Admin' },
  { value: 'skip_manager', label: 'Skip-Level Manager' },
  { value: 'custom', label: 'Custom Approver' },
];

const emptyForm: WorkflowFormData = {
  name: '',
  levels: [{ level: 1, approverType: 'reporting_manager' }],
  applicableLeaveTypes: '',
  applicableDepartments: '',
  minDaysForMultiLevel: 3,
  isActive: true,
};

export default function ApprovalWorkflowsTab() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WorkflowFormData>(emptyForm);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const res = await api.get('/leave-management/admin/workflows');
      setWorkflows(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load approval workflows.');
    } finally {
      setIsLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (wf: Workflow) => {
    setEditingId(wf.id);
    setFormData({
      name: wf.name,
      levels: wf.levels.length > 0 ? wf.levels : [{ level: 1, approverType: 'reporting_manager' }],
      applicableLeaveTypes: Array.isArray(wf.applicableLeaveTypes) ? wf.applicableLeaveTypes.join(', ') : '',
      applicableDepartments: Array.isArray(wf.applicableDepartments) ? wf.applicableDepartments.join(', ') : '',
      minDaysForMultiLevel: wf.minDaysForMultiLevel || 3,
      isActive: wf.isActive ?? true,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Workflow name is required.');
      return;
    }
    if (formData.levels.length === 0) {
      setError('At least one approval level is required.');
      return;
    }
    setError(null);
    setIsSaving(true);

    const payload = {
      name: formData.name.trim(),
      levels: formData.levels,
      applicableLeaveTypes: formData.applicableLeaveTypes
        ? formData.applicableLeaveTypes.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      applicableDepartments: formData.applicableDepartments
        ? formData.applicableDepartments.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      minDaysForMultiLevel: formData.minDaysForMultiLevel,
      isActive: formData.isActive,
    };

    try {
      if (editingId) {
        await api.patch(`/leave-management/admin/workflows/${editingId}`, payload);
      } else {
        await api.post('/leave-management/admin/workflows', payload);
      }
      closeModal();
      await loadWorkflows();
    } catch {
      setError(`Failed to ${editingId ? 'update' : 'create'} workflow.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    setError(null);
    setIsSaving(true);
    try {
      await api.delete(`/leave-management/admin/workflows/${id}`);
      await loadWorkflows();
    } catch {
      setError('Failed to delete workflow.');
    } finally {
      setIsSaving(false);
    }
  };

  const addLevel = () => {
    setFormData((prev) => ({
      ...prev,
      levels: [...prev.levels, { level: prev.levels.length + 1, approverType: 'reporting_manager' }],
    }));
  };

  const removeLevel = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      levels: prev.levels
        .filter((_, i) => i !== index)
        .map((l, i) => ({ ...l, level: i + 1 })),
    }));
  };

  const updateLevel = (index: number, approverType: string) => {
    setFormData((prev) => ({
      ...prev,
      levels: prev.levels.map((l, i) => (i === index ? { ...l, approverType } : l)),
    }));
  };

  const getApproverLabel = (type: string) =>
    APPROVER_TYPES.find((t) => t.value === type)?.label || type;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading workflows...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Approval Workflows ({workflows.length})
          </h2>
          <p className="text-sm text-text-muted">
            Define multi-level approval workflows for leave requests.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Workflow
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Workflows Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Approval Levels
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Leave Types
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Departments
              </th>
              <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Multi-Level After
              </th>
              <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {workflows.map((wf) => (
              <tr
                key={wf.id}
                className="bg-card hover:bg-background/50 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-text font-medium">
                  {wf.name}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  <div className="flex flex-wrap gap-1">
                    {(wf.levels || []).map((level) => (
                      <span
                        key={level.level}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                      >
                        L{level.level}: {getApproverLabel(level.approverType)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {Array.isArray(wf.applicableLeaveTypes) && wf.applicableLeaveTypes.length > 0
                    ? wf.applicableLeaveTypes.join(', ')
                    : 'All'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {Array.isArray(wf.applicableDepartments) && wf.applicableDepartments.length > 0
                    ? wf.applicableDepartments.join(', ')
                    : 'All'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted text-center">
                  {wf.minDaysForMultiLevel}+ days
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      wf.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {wf.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(wf)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(wf.id)}
                      disabled={isSaving}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {workflows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No approval workflows configured yet. Click &quot;Add Workflow&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">
                {editingId ? 'Edit Workflow' : 'New Workflow'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-background transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Workflow Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Standard Approval"
                  className={`${inputClassName} text-sm`}
                />
              </div>

              {/* Approval Levels */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Approval Levels</label>
                <div className="space-y-2">
                  {formData.levels.map((level, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-muted w-8">L{level.level}</span>
                      <select
                        value={level.approverType}
                        onChange={(e) => updateLevel(index, e.target.value)}
                        className={`${selectClassName} text-sm flex-1`}
                      >
                        {APPROVER_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      {formData.levels.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLevel(index)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addLevel}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add Level
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Applicable Leave Types (comma separated)</label>
                <input
                  type="text"
                  value={formData.applicableLeaveTypes}
                  onChange={(e) => setFormData({ ...formData, applicableLeaveTypes: e.target.value })}
                  placeholder="Leave empty for all types"
                  className={`${inputClassName} text-sm`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Applicable Departments (comma separated)</label>
                <input
                  type="text"
                  value={formData.applicableDepartments}
                  onChange={(e) => setFormData({ ...formData, applicableDepartments: e.target.value })}
                  placeholder="Leave empty for all departments"
                  className={`${inputClassName} text-sm`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Multi-Level Trigger (min days)</label>
                <input
                  type="number"
                  value={formData.minDaysForMultiLevel}
                  onChange={(e) => setFormData({ ...formData, minDaysForMultiLevel: parseInt(e.target.value) || 1 })}
                  min={1}
                  className={`${inputClassName} text-sm w-32`}
                />
                <p className="text-xs text-text-muted mt-1">Use all levels when leave request exceeds this many days.</p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    formData.isActive ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      formData.isActive ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
                <span className="text-sm text-text">Active</span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editingId ? 'Update Workflow' : 'Create Workflow'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
