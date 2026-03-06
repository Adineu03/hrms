'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Target,
  Plus,
  Pencil,
  Trash2,
  X,
  Inbox,
  FileText,
  Globe,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  framework: string;
  measurementCriteria: string;
  successMetrics: string;
  createdAt: string;
}

interface OrgGoal {
  id: string;
  title: string;
  description: string;
  category: string;
  targetDate: string;
  completionPercent: number;
  status: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'business', label: 'Business' },
  { value: 'technical', label: 'Technical' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'professional', label: 'Professional Development' },
  { value: 'operational', label: 'Operational' },
];

const FRAMEWORKS = [
  { value: 'okr', label: 'OKR' },
  { value: 'smart', label: 'SMART' },
  { value: 'kpi', label: 'KPI-Based' },
  { value: 'balanced_scorecard', label: 'Balanced Scorecard' },
];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  on_track: 'bg-green-100 text-green-700',
  at_risk: 'bg-yellow-50 text-yellow-700',
  behind: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
};

const defaultTemplateForm = {
  title: '',
  description: '',
  category: 'business',
  framework: 'okr',
  measurementCriteria: '',
  successMetrics: '',
};

const defaultOrgGoalForm = {
  title: '',
  description: '',
  category: 'business',
  targetDate: '',
  status: 'active',
};

export default function GoalFrameworkTab() {
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [orgGoals, setOrgGoals] = useState<OrgGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GoalTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState(defaultTemplateForm);

  const [showOrgGoalModal, setShowOrgGoalModal] = useState(false);
  const [editingOrgGoal, setEditingOrgGoal] = useState<OrgGoal | null>(null);
  const [orgGoalForm, setOrgGoalForm] = useState(defaultOrgGoalForm);

  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tRes, gRes] = await Promise.all([
        api.get('/performance-growth/admin/goal-templates'),
        api.get('/performance-growth/admin/org-goals'),
      ]);
      setTemplates(Array.isArray(tRes.data) ? tRes.data : tRes.data?.data || []);
      setOrgGoals(Array.isArray(gRes.data) ? gRes.data : gRes.data?.data || []);
    } catch {
      setError('Failed to load goal framework data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Template CRUD
  const handleSaveTemplate = async () => {
    setError(null);
    if (!templateForm.title.trim()) {
      setError('Template title is required.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingTemplate) {
        await api.patch(`/performance-growth/admin/goal-templates/${editingTemplate.id}`, templateForm);
        setSuccess('Goal template updated.');
      } else {
        await api.post('/performance-growth/admin/goal-templates', templateForm);
        setSuccess('Goal template created.');
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      setTemplateForm(defaultTemplateForm);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save goal template.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this goal template?')) return;
    try {
      await api.delete(`/performance-growth/admin/goal-templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setSuccess('Template deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete template.');
    }
  };

  // Org Goal CRUD
  const handleSaveOrgGoal = async () => {
    setError(null);
    if (!orgGoalForm.title.trim()) {
      setError('Goal title is required.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingOrgGoal) {
        await api.patch(`/performance-growth/admin/org-goals/${editingOrgGoal.id}`, orgGoalForm);
        setSuccess('Organization goal updated.');
      } else {
        await api.post('/performance-growth/admin/org-goals', orgGoalForm);
        setSuccess('Organization goal created.');
      }
      setShowOrgGoalModal(false);
      setEditingOrgGoal(null);
      setOrgGoalForm(defaultOrgGoalForm);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save organization goal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrgGoal = async (id: string) => {
    if (!confirm('Delete this organization goal?')) return;
    try {
      await api.delete(`/performance-growth/admin/org-goals/${id}`);
      setOrgGoals((prev) => prev.filter((g) => g.id !== id));
      setSuccess('Goal deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete goal.');
    }
  };

  const totalTemplates = templates.length;
  const activeOrgGoals = orgGoals.filter((g) => g.status === 'active' || g.status === 'on_track').length;
  const avgCompletion = orgGoals.length > 0
    ? Math.round(orgGoals.reduce((sum, g) => sum + (g.completionPercent || 0), 0) / orgGoals.length)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading goal framework...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Target className="h-5 w-5" />
          Goal Framework Management
        </h2>
        <p className="text-sm text-text-muted">Manage goal templates and organization-level goals.</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-background border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted uppercase font-semibold">Total Templates</p>
          <p className="text-2xl font-bold text-text mt-1">{totalTemplates}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted uppercase font-semibold">Active Org Goals</p>
          <p className="text-2xl font-bold text-text mt-1">{activeOrgGoals}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted uppercase font-semibold">Avg Completion Rate</p>
          <p className="text-2xl font-bold text-text mt-1">{avgCompletion}%</p>
        </div>
      </div>

      {/* Goal Templates Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Goal Templates
          </h3>
          <button
            type="button"
            onClick={() => { setEditingTemplate(null); setTemplateForm(defaultTemplateForm); setShowTemplateModal(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Template
          </button>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Category</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Framework</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {templates.map((tmpl) => (
                <tr key={tmpl.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm text-text font-medium">{tmpl.title}</span>
                    {tmpl.description && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{tmpl.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted capitalize">{tmpl.category}</td>
                  <td className="px-4 py-3 text-sm text-text-muted uppercase">{tmpl.framework}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => { setEditingTemplate(tmpl); setTemplateForm({ title: tmpl.title, description: tmpl.description || '', category: tmpl.category, framework: tmpl.framework, measurementCriteria: tmpl.measurementCriteria || '', successMetrics: tmpl.successMetrics || '' }); setShowTemplateModal(true); }} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDeleteTemplate(tmpl.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No goal templates yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Organization Goals Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Organization-Level Goals
          </h3>
          <button
            type="button"
            onClick={() => { setEditingOrgGoal(null); setOrgGoalForm(defaultOrgGoalForm); setShowOrgGoalModal(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Org Goal
          </button>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Category</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Target Date</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Progress</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orgGoals.map((goal) => (
                <tr key={goal.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm text-text font-medium">{goal.title}</span>
                    {goal.description && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{goal.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted capitalize">{goal.category}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : '--'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${goal.completionPercent || 0}%` }} />
                      </div>
                      <span className="text-xs text-text-muted">{goal.completionPercent || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[goal.status] || 'bg-gray-100 text-gray-600'}`}>
                      {goal.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => { setEditingOrgGoal(goal); setOrgGoalForm({ title: goal.title, description: goal.description || '', category: goal.category, targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : '', status: goal.status }); setShowOrgGoalModal(true); }} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDeleteOrgGoal(goal.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orgGoals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No organization goals yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingTemplate ? 'Edit Goal Template' : 'New Goal Template'}
              </h3>
              <button type="button" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); setTemplateForm(defaultTemplateForm); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Title *</label>
                <input type="text" value={templateForm.title} onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })} className={inputClassName} placeholder="e.g. Increase Revenue by 20%" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={templateForm.description} onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Goal template description..." rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Category</label>
                  <select value={templateForm.category} onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })} className={selectClassName}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Framework</label>
                  <select value={templateForm.framework} onChange={(e) => setTemplateForm({ ...templateForm, framework: e.target.value })} className={selectClassName}>
                    {FRAMEWORKS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Measurement Criteria</label>
                <textarea value={templateForm.measurementCriteria} onChange={(e) => setTemplateForm({ ...templateForm, measurementCriteria: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="How will progress be measured?" rows={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Success Metrics</label>
                <textarea value={templateForm.successMetrics} onChange={(e) => setTemplateForm({ ...templateForm, successMetrics: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Define what success looks like..." rows={2} />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSaveTemplate} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
              <button type="button" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); setTemplateForm(defaultTemplateForm); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Org Goal Modal */}
      {showOrgGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                {editingOrgGoal ? 'Edit Organization Goal' : 'New Organization Goal'}
              </h3>
              <button type="button" onClick={() => { setShowOrgGoalModal(false); setEditingOrgGoal(null); setOrgGoalForm(defaultOrgGoalForm); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Title *</label>
                <input type="text" value={orgGoalForm.title} onChange={(e) => setOrgGoalForm({ ...orgGoalForm, title: e.target.value })} className={inputClassName} placeholder="e.g. Achieve $10M ARR" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={orgGoalForm.description} onChange={(e) => setOrgGoalForm({ ...orgGoalForm, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Goal description..." rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Category</label>
                  <select value={orgGoalForm.category} onChange={(e) => setOrgGoalForm({ ...orgGoalForm, category: e.target.value })} className={selectClassName}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Target Date</label>
                  <input type="date" value={orgGoalForm.targetDate} onChange={(e) => setOrgGoalForm({ ...orgGoalForm, targetDate: e.target.value })} className={inputClassName} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
                <select value={orgGoalForm.status} onChange={(e) => setOrgGoalForm({ ...orgGoalForm, status: e.target.value })} className={selectClassName}>
                  <option value="active">Active</option>
                  <option value="on_track">On Track</option>
                  <option value="at_risk">At Risk</option>
                  <option value="behind">Behind</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSaveOrgGoal} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingOrgGoal ? 'Update Goal' : 'Create Goal'}
              </button>
              <button type="button" onClick={() => { setShowOrgGoalModal(false); setEditingOrgGoal(null); setOrgGoalForm(defaultOrgGoalForm); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
