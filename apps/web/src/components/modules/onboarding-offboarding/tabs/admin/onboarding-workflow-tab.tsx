'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface WorkflowTask {
  id: string;
  title: string;
  assigneeRole: string;
  dayOffset: number;
  isMandatory: boolean;
  description: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  departmentName: string;
  employmentType: string;
  taskCount: number;
  status: string;
  tasks: WorkflowTask[];
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-yellow-50 text-yellow-700',
};

const EMPLOYMENT_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];

const ASSIGNEE_ROLES = [
  { value: 'hr', label: 'HR' },
  { value: 'manager', label: 'Manager' },
  { value: 'it', label: 'IT Team' },
  { value: 'admin', label: 'Admin' },
  { value: 'employee', label: 'New Hire' },
  { value: 'buddy', label: 'Buddy' },
];

const defaultFormData = {
  name: '',
  description: '',
  departmentId: '',
  employmentType: 'all',
  status: 'draft',
};

const defaultTaskData = {
  title: '',
  assigneeRole: 'hr',
  dayOffset: 0,
  isMandatory: true,
  description: '',
};

export default function OnboardingWorkflowTab() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkflowTask | null>(null);
  const [taskFormData, setTaskFormData] = useState(defaultTaskData);
  const [taskParentId, setTaskParentId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [wfRes, deptRes] = await Promise.all([
        api.get('/onboarding-offboarding/admin/onboarding-workflows'),
        api.get('/onboarding-offboarding/admin/departments').catch(() => ({ data: [] })),
      ]);
      setWorkflows(Array.isArray(wfRes.data) ? wfRes.data : wfRes.data?.data || []);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.data || []);
    } catch {
      setError('Failed to load onboarding workflows.');
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
      if (editingWorkflow) {
        await api.patch(`/onboarding-offboarding/admin/onboarding-workflows/${editingWorkflow.id}`, formData);
        setSuccess('Workflow updated successfully.');
      } else {
        await api.post('/onboarding-offboarding/admin/onboarding-workflows', formData);
        setSuccess('Workflow created successfully.');
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
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    setError(null);
    try {
      await api.delete(`/onboarding-offboarding/admin/onboarding-workflows/${id}`);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      setSuccess('Workflow deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete workflow.');
    }
  };

  const openEdit = (wf: Workflow) => {
    setEditingWorkflow(wf);
    setFormData({
      name: wf.name,
      description: wf.description,
      departmentId: wf.departmentId || '',
      employmentType: wf.employmentType || 'all',
      status: wf.status,
    });
    setShowCreateForm(true);
  };

  const openCreate = () => {
    setEditingWorkflow(null);
    setFormData(defaultFormData);
    setShowCreateForm(true);
  };

  const handleSaveTask = async () => {
    if (!taskParentId || !taskFormData.title.trim()) {
      setError('Task title is required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (editingTask) {
        await api.patch(
          `/onboarding-offboarding/admin/onboarding-workflows/${taskParentId}/tasks/${editingTask.id}`,
          taskFormData
        );
        setSuccess('Task updated.');
      } else {
        await api.post(
          `/onboarding-offboarding/admin/onboarding-workflows/${taskParentId}/tasks`,
          taskFormData
        );
        setSuccess('Task added.');
      }
      setShowTaskForm(false);
      setEditingTask(null);
      setTaskFormData(defaultTaskData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save task.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async (workflowId: string, taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/onboarding-offboarding/admin/onboarding-workflows/${workflowId}/tasks/${taskId}`);
      setSuccess('Task deleted.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete task.');
    }
  };

  const openAddTask = (workflowId: string) => {
    setTaskParentId(workflowId);
    setEditingTask(null);
    setTaskFormData(defaultTaskData);
    setShowTaskForm(true);
  };

  const openEditTask = (workflowId: string, task: WorkflowTask) => {
    setTaskParentId(workflowId);
    setEditingTask(task);
    setTaskFormData({
      title: task.title,
      assigneeRole: task.assigneeRole,
      dayOffset: task.dayOffset,
      isMandatory: task.isMandatory,
      description: task.description,
    });
    setShowTaskForm(true);
  };

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
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Onboarding Workflow Management
        </h2>
        <p className="text-sm text-text-muted">Create and manage onboarding workflow templates with tasks.</p>
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
          New Workflow
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Tasks</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {workflows.map((wf) => (
              <>
                <tr key={wf.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{wf.name}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{wf.departmentName || 'All'}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{wf.taskCount || wf.tasks?.length || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[wf.status] || 'bg-gray-100 text-gray-600'}`}>
                      {wf.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setExpandedWorkflow(expandedWorkflow === wf.id ? null : wf.id)}
                        className="p-1 text-text-muted hover:text-primary transition-colors"
                        title="Toggle tasks"
                      >
                        {expandedWorkflow === wf.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" onClick={() => openEdit(wf)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDelete(wf.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedWorkflow === wf.id && (
                  <tr key={`${wf.id}-tasks`}>
                    <td colSpan={5} className="px-4 py-3 bg-background/30">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-text-muted uppercase">Workflow Tasks</span>
                          <button
                            type="button"
                            onClick={() => openAddTask(wf.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            Add Task
                          </button>
                        </div>
                        {(wf.tasks || []).length === 0 ? (
                          <p className="text-xs text-text-muted italic">No tasks defined yet.</p>
                        ) : (
                          <div className="space-y-1">
                            {(wf.tasks || []).map((task) => (
                              <div key={task.id} className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2">
                                <GripVertical className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm text-text font-medium">{task.title}</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-text-muted">Day {task.dayOffset}</span>
                                    <span className="text-xs text-text-muted capitalize">{task.assigneeRole}</span>
                                    {task.isMandatory && (
                                      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Required</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={() => openEditTask(wf.id, task)} className="p-1 text-text-muted hover:text-primary transition-colors">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button type="button" onClick={() => handleDeleteTask(wf.id, task.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {workflows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No onboarding workflows yet. Create your first workflow.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Workflow Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingWorkflow ? 'Edit Workflow' : 'New Onboarding Workflow'}
              </h3>
              <button type="button" onClick={() => { setShowCreateForm(false); setEditingWorkflow(null); setFormData(defaultFormData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Workflow Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClassName} placeholder="e.g. Engineering Onboarding" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Workflow description..." rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Department</label>
                  <select value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} className={selectClassName}>
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Employment Type</label>
                  <select value={formData.employmentType} onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })} className={selectClassName}>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
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

      {/* Add/Edit Task Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingTask ? 'Edit Task' : 'Add Workflow Task'}
              </h3>
              <button type="button" onClick={() => { setShowTaskForm(false); setEditingTask(null); setTaskFormData(defaultTaskData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Task Title *</label>
                <input type="text" value={taskFormData.title} onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })} className={inputClassName} placeholder="e.g. Setup workstation" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Assigned To</label>
                  <select value={taskFormData.assigneeRole} onChange={(e) => setTaskFormData({ ...taskFormData, assigneeRole: e.target.value })} className={selectClassName}>
                    {ASSIGNEE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Day Offset</label>
                  <input type="number" value={taskFormData.dayOffset} onChange={(e) => setTaskFormData({ ...taskFormData, dayOffset: parseInt(e.target.value) || 0 })} className={inputClassName} min={-30} max={90} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={taskFormData.description} onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Task details..." rows={2} />
              </div>
              <label className="flex items-center gap-2 text-sm text-text">
                <input type="checkbox" checked={taskFormData.isMandatory} onChange={(e) => setTaskFormData({ ...taskFormData, isMandatory: e.target.checked })} className="rounded border-border text-primary focus:ring-primary" />
                Mandatory task
              </label>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSaveTask} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTask ? 'Update Task' : 'Add Task'}
              </button>
              <button type="button" onClick={() => { setShowTaskForm(false); setEditingTask(null); setTaskFormData(defaultTaskData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
