'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Inbox,
  PlayCircle,
  BookOpen,
  Award,
  Clock,
} from 'lucide-react';

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  type: string;
  duration: number;
  status: string;
  completedAt: string | null;
  score: number | null;
  passingScore: number | null;
  materialUrl: string | null;
  order: number;
}

interface TrainingProgress {
  totalModules: number;
  completedModules: number;
  completionPercent: number;
  totalDuration: number;
  completedDuration: number;
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  not_started: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-red-700',
};

const TYPE_ICONS: Record<string, typeof BookOpen> = {
  video: PlayCircle,
  document: BookOpen,
  quiz: Award,
  interactive: GraduationCap,
};

export default function OrientationTrainingTab() {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [modulesRes, progressRes] = await Promise.all([
        api.get('/onboarding-offboarding/employee/orientation/modules').catch(() => ({ data: [] })),
        api.get('/onboarding-offboarding/employee/orientation/completion-status').catch(() => ({ data: null })),
      ]);
      const modData = modulesRes.data;
      setModules(Array.isArray(modData) ? modData : Array.isArray(modData?.data) ? modData.data : []);
      setProgress(progressRes.data?.data || progressRes.data);
    } catch {
      setError('Failed to load training modules.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartModule = async (moduleId: string) => {
    setError(null);
    try {
      await api.post(`/onboarding-offboarding/employee/orientation/modules/${moduleId}/complete`, { action: 'start' });
      setSuccess('Module started.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to start module.');
    }
  };

  const handleCompleteModule = async (moduleId: string) => {
    setError(null);
    setCompletingId(moduleId);
    try {
      await api.post(`/onboarding-offboarding/employee/orientation/modules/${moduleId}/complete`);
      setSuccess('Module completed!');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to complete module.');
    } finally {
      setCompletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading training modules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Orientation & Training
        </h2>
        <p className="text-sm text-text-muted">Complete your onboarding training modules and assessments.</p>
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

      {/* Progress Overview */}
      {progress && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text">Training Progress</span>
            <span className="text-sm font-bold text-primary">{progress.completionPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div
              className="bg-primary h-3 rounded-full transition-all"
              style={{ width: `${progress.completionPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{progress.completedModules} of {progress.totalModules} modules completed</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {progress.completedDuration} of {progress.totalDuration} min
            </span>
          </div>
        </div>
      )}

      {/* Training Modules List */}
      <div className="space-y-3">
        {modules.map((mod, idx) => {
          const TypeIcon = TYPE_ICONS[mod.type] || BookOpen;
          return (
            <div key={mod.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                    <TypeIcon className="h-4 w-4 text-text-muted" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted font-medium">#{idx + 1}</span>
                      <span className="text-sm font-semibold text-text">{mod.title}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[mod.status] || 'bg-gray-100 text-gray-600'}`}>
                        {mod.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {mod.description && <p className="text-xs text-text-muted mt-1">{mod.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {mod.duration} min
                      </span>
                      <span className="capitalize">{mod.type}</span>
                      {mod.score != null && (
                        <span className={mod.score >= (mod.passingScore || 0) ? 'text-green-600' : 'text-red-600'}>
                          Score: {mod.score}%
                          {mod.passingScore != null && ` (pass: ${mod.passingScore}%)`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  {mod.materialUrl && (
                    <a
                      href={mod.materialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background transition-colors"
                    >
                      <BookOpen className="h-3 w-3" />
                      View
                    </a>
                  )}
                  {mod.status === 'not_started' && (
                    <button
                      type="button"
                      onClick={() => handleStartModule(mod.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                    >
                      <PlayCircle className="h-3 w-3" />
                      Start
                    </button>
                  )}
                  {mod.status === 'in_progress' && (
                    <button
                      type="button"
                      onClick={() => handleCompleteModule(mod.id)}
                      disabled={completingId === mod.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {completingId === mod.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      Complete
                    </button>
                  )}
                  {mod.status === 'completed' && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {modules.length === 0 && (
          <div className="text-center py-8">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">No training modules assigned yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
