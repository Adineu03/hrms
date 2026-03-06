'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Inbox,
  Calendar,
  Check,
} from 'lucide-react';

interface OnboardingTask {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  assigneeRole: string;
}

interface NewHire {
  id: string;
  employeeName: string;
  department: string;
  designation: string;
  startDate: string;
  daysElapsed: number;
  completionPercent: number;
  pendingTasks: number;
  totalTasks: number;
  status: string;
  tasks: OnboardingTask[];
}

const STATUS_STYLES: Record<string, string> = {
  on_track: 'bg-green-100 text-green-700',
  at_risk: 'bg-yellow-50 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function TeamOnboardingTab() {
  const [newHires, setNewHires] = useState<NewHire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedHire, setExpandedHire] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/onboarding-offboarding/manager/team-onboarding');
      setNewHires(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load team onboarding data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompleteTask = async (hireId: string, taskId: string) => {
    setError(null);
    try {
      await api.patch(`/onboarding-offboarding/manager/team-onboarding/${hireId}/tasks/${taskId}/complete`);
      setSuccess('Task marked as complete.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to complete task.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading team onboarding...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Team Onboarding Progress
        </h2>
        <p className="text-sm text-text-muted">Track and manage onboarding progress for your new team members.</p>
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

      {newHires.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No new hires currently onboarding in your team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {newHires.map((hire) => (
            <div key={hire.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-text">{hire.employeeName}</h3>
                  <p className="text-xs text-text-muted">{hire.designation} - {hire.department}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[hire.status] || 'bg-gray-100 text-gray-600'}`}>
                  {hire.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Started {hire.startDate ? new Date(hire.startDate).toLocaleDateString() : '--'}
                </span>
                <span>{hire.daysElapsed} days ago</span>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-muted">Progress</span>
                  <span className="text-xs font-medium text-text">{hire.completionPercent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      hire.completionPercent >= 80 ? 'bg-green-500' : hire.completionPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${hire.completionPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">{hire.pendingTasks} of {hire.totalTasks} tasks pending</span>
                <button
                  type="button"
                  onClick={() => setExpandedHire(expandedHire === hire.id ? null : hire.id)}
                  className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                >
                  {expandedHire === hire.id ? 'Hide Tasks' : 'View Tasks'}
                </button>
              </div>

              {/* Expanded Tasks */}
              {expandedHire === hire.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  {(hire.tasks || []).map((task) => (
                    <div key={task.id} className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${task.status === 'completed' ? 'text-text-muted line-through' : 'text-text'}`}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-text-muted capitalize">{task.assigneeRole}</span>
                          {task.dueDate && (
                            <span className="text-[10px] text-text-muted">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      {task.status !== 'completed' && task.assigneeRole === 'manager' && (
                        <button
                          type="button"
                          onClick={() => handleCompleteTask(hire.id, task.id)}
                          className="p-1.5 text-text-muted hover:text-green-600 transition-colors"
                          title="Complete task"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      {task.status === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  {(hire.tasks || []).length === 0 && (
                    <p className="text-xs text-text-muted italic text-center py-2">No tasks assigned.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
