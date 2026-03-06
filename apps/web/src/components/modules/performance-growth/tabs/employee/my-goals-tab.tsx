'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Target,
  Inbox,
  X,
  Filter,
  GitBranch,
  Plus,
  Edit3,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface Goal {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: string;
  progress: number;
  category: string;
  isPersonal: boolean;
  parentGoalTitle: string | null;
  alignmentPath: string[];
}

const STATUS_STYLES: Record<string, string> = {
  on_track: 'bg-green-100 text-green-700',
  at_risk: 'bg-yellow-50 text-yellow-700',
  behind: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  not_started: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-50 text-yellow-700',
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Goals' },
  { value: 'on_track', label: 'On Track' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'behind', label: 'Behind' },
  { value: 'completed', label: 'Completed' },
  { value: 'not_started', label: 'Not Started' },
];

export default function MyGoalsTab() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Update progress modal
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressGoalId, setProgressGoalId] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressComment, setProgressComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modification request
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyGoalId, setModifyGoalId] = useState<string | null>(null);
  const [modifyReason, setModifyReason] = useState('');

  // Add personal goal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', description: '', dueDate: '', category: 'professional' });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/performance-growth/employee/my-goals');
      setGoals(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load goals.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateProgress = async () => {
    if (!progressGoalId) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.patch(`/performance-growth/employee/my-goals/${progressGoalId}/progress`, {
        progress: progressValue,
        comment: progressComment,
      });
      setSuccess('Progress updated.');
      setShowProgressModal(false);
      setProgressGoalId(null);
      setProgressValue(0);
      setProgressComment('');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to update progress.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestModification = async () => {
    if (!modifyGoalId || !modifyReason.trim()) {
      setError('Please provide a reason for modification.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post(`/performance-growth/employee/my-goals/${modifyGoalId}/request-modification`, {
        reason: modifyReason,
      });
      setSuccess('Modification request submitted.');
      setShowModifyModal(false);
      setModifyGoalId(null);
      setModifyReason('');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit modification request.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPersonalGoal = async () => {
    if (!addForm.title.trim()) {
      setError('Goal title is required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/performance-growth/employee/my-goals', { ...addForm, isPersonal: true });
      setSuccess('Personal goal added.');
      setShowAddModal(false);
      setAddForm({ title: '', description: '', dueDate: '', category: 'professional' });
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to add personal goal.');
    } finally {
      setIsSaving(false);
    }
  };

  const openProgressModal = (goal: Goal) => {
    setProgressGoalId(goal.id);
    setProgressValue(goal.progress || 0);
    setProgressComment('');
    setShowProgressModal(true);
  };

  const filteredGoals = statusFilter === 'all' ? goals : goals.filter((g) => g.status === statusFilter);
  const assignedGoals = filteredGoals.filter((g) => !g.isPersonal);
  const personalGoals = filteredGoals.filter((g) => g.isPersonal);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading goals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Target className="h-5 w-5" />
          My Goals
        </h2>
        <p className="text-sm text-text-muted">Track your assigned and personal goals.</p>
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
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${selectClassName} !w-auto`}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Personal Goal
        </button>
      </div>

      {/* Assigned Goals */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text">Assigned Goals ({assignedGoals.length})</h3>
        {assignedGoals.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">No assigned goals found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {assignedGoals.map((goal) => (
              <div key={goal.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-text">{goal.title}</h4>
                    {goal.description && <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{goal.description}</p>}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${STATUS_STYLES[goal.status] || 'bg-gray-100 text-gray-600'}`}>
                    {goal.status?.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Due date */}
                {goal.dueDate && (
                  <p className="text-xs text-text-muted mb-2">Due: {new Date(goal.dueDate).toLocaleDateString()}</p>
                )}

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">Progress</span>
                    <span className="text-xs font-medium text-text">{goal.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${goal.progress >= 80 ? 'bg-green-500' : goal.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${goal.progress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Alignment */}
                {goal.parentGoalTitle && (
                  <div className="flex items-center gap-1 text-[10px] text-text-muted mb-2">
                    <GitBranch className="h-3 w-3" />
                    Aligned to: {goal.parentGoalTitle}
                  </div>
                )}
                {goal.alignmentPath?.length > 0 && (
                  <div className="text-[10px] text-text-muted mb-2">
                    {goal.alignmentPath.join(' > ')}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => openProgressModal(goal)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                  >
                    Update Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModifyGoalId(goal.id); setModifyReason(''); setShowModifyModal(true); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    Request Modification
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Personal Goals */}
      {personalGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text">Personal Goals ({personalGoals.length})</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {personalGoals.map((goal) => (
              <div key={goal.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-text">{goal.title}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[goal.status] || 'bg-gray-100 text-gray-600'}`}>
                    {goal.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                {goal.description && <p className="text-xs text-text-muted mb-2">{goal.description}</p>}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">Progress</span>
                    <span className="text-xs font-medium text-text">{goal.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${goal.progress || 0}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openProgressModal(goal)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                >
                  Update Progress
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Update Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Update Goal Progress</h3>
              <button type="button" onClick={() => setShowProgressModal(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Progress ({progressValue}%)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progressValue}
                  onChange={(e) => setProgressValue(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-text-muted">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Comment</label>
                <textarea value={progressComment} onChange={(e) => setProgressComment(e.target.value)} className={`${inputClassName} min-h-[60px]`} placeholder="Add a progress update comment..." rows={2} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleUpdateProgress} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Update
              </button>
              <button type="button" onClick={() => setShowProgressModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Modification Modal */}
      {showModifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Request Goal Modification</h3>
              <button type="button" onClick={() => setShowModifyModal(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Reason for Modification *</label>
                <textarea value={modifyReason} onChange={(e) => setModifyReason(e.target.value)} className={`${inputClassName} min-h-[80px]`} placeholder="Explain why this goal should be modified..." rows={3} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleRequestModification} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Request
              </button>
              <button type="button" onClick={() => setShowModifyModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Personal Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Add Personal Goal</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Title *</label>
                <input type="text" value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })} className={inputClassName} placeholder="e.g. Learn TypeScript advanced patterns" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Goal description..." rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Category</label>
                  <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className={selectClassName}>
                    <option value="professional">Professional</option>
                    <option value="technical">Technical</option>
                    <option value="leadership">Leadership</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Due Date</label>
                  <input type="date" value={addForm.dueDate} onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })} className={inputClassName} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleAddPersonalGoal} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Goal
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
