'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Target,
  Plus,
  X,
  Inbox,
  Check,
  XCircle,
  GitBranch,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface TeamGoal {
  id: string;
  employeeName: string;
  employeeId: string;
  title: string;
  description: string;
  progress: number;
  status: string;
  dueDate: string;
  category: string;
  parentGoalTitle: string | null;
  pendingModification: boolean;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const STATUS_STYLES: Record<string, string> = {
  on_track: 'bg-green-100 text-green-700',
  at_risk: 'bg-yellow-50 text-yellow-700',
  behind: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-50 text-yellow-700',
  not_started: 'bg-gray-100 text-gray-600',
};

const defaultFormData = {
  employeeId: '',
  title: '',
  description: '',
  category: 'business',
  dueDate: '',
  parentGoalId: '',
};

const CATEGORIES = [
  { value: 'business', label: 'Business' },
  { value: 'technical', label: 'Technical' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'professional', label: 'Professional' },
  { value: 'operational', label: 'Operational' },
];

export default function GoalManagementTab() {
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cascade'>('table');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [goalsRes, empRes] = await Promise.all([
        api.get('/performance-growth/manager/goals').catch(() => ({ data: [] })),
        api.get('/core-hr/admin/employees').catch(() => ({ data: [] })),
      ]);
      const goalsRaw = goalsRes.data;
      setGoals(Array.isArray(goalsRaw) ? goalsRaw : Array.isArray(goalsRaw?.data) ? goalsRaw.data : []);
      const empRaw = empRes.data;
      setEmployees(Array.isArray(empRaw) ? empRaw : Array.isArray(empRaw?.data) ? empRaw.data : []);
    } catch {
      setError('Failed to load team goals.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.employeeId || !formData.title.trim()) {
      setError('Employee and goal title are required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/performance-growth/manager/goals', formData);
      setSuccess('Goal assigned successfully.');
      setShowModal(false);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to assign goal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveModification = async (goalId: string) => {
    setError(null);
    try {
      await api.post(`/performance-growth/manager/goals/${goalId}/approve`);
      setSuccess('Goal modification approved.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to approve modification.');
    }
  };

  const handleRejectModification = async (goalId: string) => {
    setError(null);
    try {
      await api.post(`/performance-growth/manager/goals/${goalId}/reject`);
      setSuccess('Goal modification rejected.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to reject modification.');
    }
  };

  // Group goals by employee for cascade view
  const goalsByEmployee = goals.reduce<Record<string, TeamGoal[]>>((acc, goal) => {
    const key = goal.employeeName || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(goal);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading team goals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Target className="h-5 w-5" />
          Team Goal Management
        </h2>
        <p className="text-sm text-text-muted">Assign, track, and approve goals for your team.</p>
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

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'table' ? 'cascade' : 'table')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
        >
          <GitBranch className="h-4 w-4" />
          {viewMode === 'table' ? 'Cascaded View' : 'Table View'}
        </button>
        <button
          type="button"
          onClick={() => { setFormData(defaultFormData); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Assign Goal
        </button>
      </div>

      {viewMode === 'table' ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Goal</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Progress</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Due Date</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {goals.map((goal) => (
                <tr key={goal.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{goal.employeeName}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text">{goal.title}</span>
                    {goal.parentGoalTitle && (
                      <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1">
                        <GitBranch className="h-2.5 w-2.5" />
                        {goal.parentGoalTitle}
                      </p>
                    )}
                    {goal.pendingModification && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 mt-0.5">
                        Modification Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${goal.progress >= 80 ? 'bg-green-500' : goal.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${goal.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted">{goal.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[goal.status] || 'bg-gray-100 text-gray-600'}`}>
                      {goal.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : '--'}</td>
                  <td className="px-4 py-3">
                    {goal.pendingModification && (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleApproveModification(goal.id)} className="p-1 text-text-muted hover:text-green-600 transition-colors" title="Approve">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => handleRejectModification(goal.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Reject">
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {goals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No team goals yet. Assign your first goal.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cascade View */
        <div className="space-y-4">
          {Object.keys(goalsByEmployee).length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-muted">No team goals yet.</p>
            </div>
          ) : (
            Object.entries(goalsByEmployee).map(([empName, empGoals]) => (
              <div key={empName} className="border border-border rounded-xl overflow-hidden">
                <div className="bg-background px-4 py-3">
                  <h3 className="text-sm font-semibold text-text">{empName}</h3>
                </div>
                <div className="p-4 space-y-2">
                  {empGoals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2">
                      {goal.parentGoalTitle && (
                        <div className="w-4 border-l-2 border-b-2 border-border h-4 flex-shrink-0 ml-2" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-text font-medium">{goal.title}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[goal.status] || 'bg-gray-100 text-gray-600'}`}>
                            {goal.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {goal.parentGoalTitle && (
                          <p className="text-[10px] text-text-muted mt-0.5">Aligned to: {goal.parentGoalTitle}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-14 bg-gray-200 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${goal.progress || 0}%` }} />
                        </div>
                        <span className="text-xs text-text-muted">{goal.progress || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Assign Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Assign New Goal</h3>
              <button type="button" onClick={() => { setShowModal(false); setFormData(defaultFormData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Employee *</label>
                <select value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} className={selectClassName}>
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Goal Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputClassName} placeholder="e.g. Complete API migration" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Goal description..." rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={selectClassName}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Due Date</label>
                  <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className={inputClassName} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Assign Goal
              </button>
              <button type="button" onClick={() => { setShowModal(false); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
