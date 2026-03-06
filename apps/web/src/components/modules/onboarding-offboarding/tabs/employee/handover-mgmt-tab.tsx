'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeftRight,
  Inbox,
  Plus,
  Trash2,
  X,
  Send,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface HandoverTask {
  id: string;
  title: string;
  description: string;
  successorName: string;
  successorId: string;
  priority: string;
  status: string;
}

interface HandoverDocument {
  id: string;
  status: string;
  tasks: HandoverTask[];
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  credentials: string;
}

interface Colleague {
  id: string;
  name: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  transferred: 'bg-purple-100 text-purple-700',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700',
};

const defaultTaskForm = {
  title: '',
  description: '',
  successorId: '',
  priority: 'medium',
};

export default function HandoverMgmtTab() {
  const [handover, setHandover] = useState<HandoverDocument | null>(null);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [credentialsText, setCredentialsText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [handoverRes, colleaguesRes] = await Promise.all([
        api.get('/onboarding-offboarding/employee/handover'),
        api.get('/onboarding-offboarding/employee/colleagues'),
      ]);
      const data = handoverRes.data?.data || handoverRes.data;
      setHandover(data);
      setCredentialsText(data?.credentials || '');
      setColleagues(Array.isArray(colleaguesRes.data) ? colleaguesRes.data : colleaguesRes.data?.data || []);
    } catch {
      setError('Failed to load handover document.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddTask = async () => {
    setError(null);
    if (!taskForm.title.trim()) {
      setError('Task title is required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/onboarding-offboarding/employee/handover/tasks', taskForm);
      setSuccess('Task added.');
      setShowTaskForm(false);
      setTaskForm(defaultTaskForm);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to add task.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this handover task?')) return;
    setError(null);
    try {
      await api.delete(`/onboarding-offboarding/employee/handover/tasks/${taskId}`);
      setSuccess('Task removed.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to delete task.');
    }
  };

  const handleSaveCredentials = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await api.patch('/onboarding-offboarding/employee/handover/credentials', { credentials: credentialsText });
      setSuccess('Credentials saved.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save credentials.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!confirm('Submit handover for manager approval?')) return;
    setError(null);
    setIsSaving(true);
    try {
      await api.patch('/onboarding-offboarding/employee/handover/submit');
      setSuccess('Handover submitted for approval.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit handover.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading handover document...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          Handover Management
        </h2>
        <p className="text-sm text-text-muted">Create your handover document, assign tasks to successors, and share credentials.</p>
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

      {/* Status */}
      {handover && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">Status:</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[handover.status] || 'bg-gray-100 text-gray-600'}`}>
            {handover.status}
          </span>
          {handover.submittedAt && <span className="text-xs text-text-muted">Submitted: {new Date(handover.submittedAt).toLocaleDateString()}</span>}
          {handover.approvedBy && <span className="text-xs text-green-600">Approved by: {handover.approvedBy}</span>}
        </div>
      )}

      {/* Handover Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text">Handover Tasks</h3>
          {(!handover || handover.status === 'draft' || handover.status === 'rejected') && (
            <button type="button" onClick={() => { setTaskForm(defaultTaskForm); setShowTaskForm(true); }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors">
              <Plus className="h-3 w-3" />
              Add Task
            </button>
          )}
        </div>
        <div className="space-y-2">
          {(handover?.tasks || []).map((task) => (
            <div key={task.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">{task.title}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_STYLES[task.priority] || 'bg-gray-100 text-gray-600'}`}>
                    {task.priority}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[task.status] || 'bg-gray-100 text-gray-600'}`}>
                    {task.status}
                  </span>
                </div>
                {task.description && <p className="text-xs text-text-muted mt-0.5">{task.description}</p>}
                <span className="text-[10px] text-text-muted">Successor: {task.successorName || 'Unassigned'}</span>
              </div>
              {(!handover || handover.status === 'draft' || handover.status === 'rejected') && (
                <button type="button" onClick={() => handleDeleteTask(task.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors ml-2">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {(handover?.tasks || []).length === 0 && (
            <div className="text-center py-6">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted">No handover tasks added yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Credentials Section */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Shared Credentials / Access Info</h3>
        <textarea
          value={credentialsText}
          onChange={(e) => setCredentialsText(e.target.value)}
          className={`${inputClassName} min-h-[100px]`}
          placeholder="List any shared accounts, access credentials, or access instructions that need to be transferred..."
          rows={5}
          disabled={handover?.status === 'submitted' || handover?.status === 'approved'}
        />
        {(!handover || handover.status === 'draft' || handover.status === 'rejected') && (
          <button type="button" onClick={handleSaveCredentials} disabled={isSaving} className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
            {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save Credentials
          </button>
        )}
      </div>

      {/* Submit for Approval */}
      {handover && (handover.status === 'draft' || handover.status === 'rejected') && (
        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={handleSubmitForApproval}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Send className="h-4 w-4" />
            Submit for Approval
          </button>
        </div>
      )}

      {/* Add Task Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Add Handover Task</h3>
              <button type="button" onClick={() => setShowTaskForm(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Task Title *</label>
                <input type="text" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className={inputClassName} placeholder="e.g. Hand over client accounts" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                <textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} className={`${inputClassName} min-h-[60px]`} placeholder="Task details..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Successor</label>
                  <select value={taskForm.successorId} onChange={(e) => setTaskForm({ ...taskForm, successorId: e.target.value })} className={selectClassName}>
                    <option value="">Select person</option>
                    {colleagues.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Priority</label>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} className={selectClassName}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleAddTask} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Task
              </button>
              <button type="button" onClick={() => setShowTaskForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
