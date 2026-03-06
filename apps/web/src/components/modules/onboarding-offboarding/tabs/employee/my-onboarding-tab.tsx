'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Rocket,
  Inbox,
  Calendar,
  Users,
  Star,
  Check,
  Square,
} from 'lucide-react';

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: string;
  category: string;
  isMandatory: boolean;
}

interface BuddyInfo {
  name: string;
  designation: string;
  email: string;
  phone: string;
}

interface FirstDayEssentials {
  workstation: string;
  email: string;
  slackChannel: string;
  parkingInfo: string;
  lunchInfo: string;
}

interface OnboardingJourney {
  completionPercent: number;
  totalTasks: number;
  completedTasks: number;
  startDate: string;
  expectedEndDate: string;
  tasks: OnboardingTask[];
  buddy: BuddyInfo | null;
  firstDayEssentials: FirstDayEssentials | null;
  welcomeMessage: string;
}

const TASK_STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-50 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
};

export default function MyOnboardingTab() {
  const [journey, setJourney] = useState<OnboardingJourney | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/onboarding-offboarding/employee/my-onboarding');
      setJourney(res.data?.data || res.data);
    } catch {
      setError('Failed to load onboarding journey.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompleteTask = async (taskId: string) => {
    setError(null);
    try {
      await api.patch(`/onboarding-offboarding/employee/my-onboarding/tasks/${taskId}/complete`);
      setSuccess('Task completed!');
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
        <span className="ml-2 text-sm text-text-muted">Loading your onboarding journey...</span>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="text-center py-12">
        <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm text-text-muted">No active onboarding journey found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          My Onboarding Journey
        </h2>
        <p className="text-sm text-text-muted">Track your onboarding progress and complete tasks.</p>
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

      {/* Welcome Message */}
      {journey.welcomeMessage && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-sm text-text">{journey.welcomeMessage}</p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text">Overall Progress</span>
          <span className="text-sm font-bold text-primary">{journey.completionPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
          <div
            className="bg-primary h-3 rounded-full transition-all"
            style={{ width: `${journey.completionPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{journey.completedTasks} of {journey.totalTasks} tasks completed</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Expected: {journey.expectedEndDate ? new Date(journey.expectedEndDate).toLocaleDateString() : '--'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Task Checklist */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-text">Onboarding Tasks</h3>
          {(journey.tasks || []).map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-3 bg-card border border-border rounded-lg px-4 py-3 ${
                task.status === 'completed' ? 'opacity-70' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => task.status !== 'completed' && handleCompleteTask(task.id)}
                disabled={task.status === 'completed'}
                className="mt-0.5 flex-shrink-0"
              >
                {task.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Square className="h-5 w-5 text-text-muted hover:text-primary transition-colors" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${task.status === 'completed' ? 'text-text-muted line-through' : 'text-text'}`}>
                    {task.title}
                  </span>
                  {task.isMandatory && (
                    <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Required</span>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${TASK_STATUS_STYLES[task.status] || 'bg-gray-100 text-gray-600'}`}>
                    {task.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {task.description && (
                  <p className="text-xs text-text-muted mt-0.5">{task.description}</p>
                )}
                {task.dueDate && (
                  <span className="text-[10px] text-text-muted">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
          {(journey.tasks || []).length === 0 && (
            <div className="text-center py-6">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted">No tasks assigned yet.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Buddy Card */}
          {journey.buddy && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" />
                Your Buddy
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-text">{journey.buddy.name}</p>
                  <p className="text-xs text-text-muted">{journey.buddy.designation}</p>
                </div>
                <div className="text-xs text-text-muted space-y-1">
                  <p>Email: {journey.buddy.email}</p>
                  {journey.buddy.phone && <p>Phone: {journey.buddy.phone}</p>}
                </div>
              </div>
            </div>
          )}

          {/* First Day Essentials */}
          {journey.firstDayEssentials && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
                <Star className="h-4 w-4" />
                First Day Essentials
              </h3>
              <div className="space-y-2 text-xs text-text-muted">
                {journey.firstDayEssentials.workstation && (
                  <div className="flex items-start gap-2">
                    <Check className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                    <span>Workstation: {journey.firstDayEssentials.workstation}</span>
                  </div>
                )}
                {journey.firstDayEssentials.email && (
                  <div className="flex items-start gap-2">
                    <Check className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                    <span>Email: {journey.firstDayEssentials.email}</span>
                  </div>
                )}
                {journey.firstDayEssentials.slackChannel && (
                  <div className="flex items-start gap-2">
                    <Check className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                    <span>Slack: {journey.firstDayEssentials.slackChannel}</span>
                  </div>
                )}
                {journey.firstDayEssentials.parkingInfo && (
                  <div className="flex items-start gap-2">
                    <Check className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                    <span>Parking: {journey.firstDayEssentials.parkingInfo}</span>
                  </div>
                )}
                {journey.firstDayEssentials.lunchInfo && (
                  <div className="flex items-start gap-2">
                    <Check className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                    <span>Lunch: {journey.firstDayEssentials.lunchInfo}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
