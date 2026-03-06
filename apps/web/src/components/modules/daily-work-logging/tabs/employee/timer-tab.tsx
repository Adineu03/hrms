'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Timer,
  Play,
  Pause,
  Square,
  ArrowRight,
  Clock,
  Inbox,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface ActiveTimer {
  id: string;
  projectId: string;
  projectName: string;
  taskCategory: string;
  description: string;
  billable: boolean;
  startedAt: string;
  isRunning: boolean;
  pausedDuration: number; // seconds already paused
}

interface TimerHistoryEntry {
  id: string;
  projectName: string;
  taskCategory: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number; // seconds
  billable: boolean;
  converted: boolean;
}

interface DailySummary {
  totalTracked: number; // seconds
  totalEntries: number;
  billableTracked: number; // seconds
}

interface ProjectOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function TimerTab() {
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [history, setHistory] = useState<TimerHistoryEntry[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary>({
    totalTracked: 0,
    totalEntries: 0,
    billableTracked: 0,
  });
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // New timer form
  const [newTimer, setNewTimer] = useState({
    projectId: '',
    taskCategory: '',
    description: '',
    billable: true,
  });
  const [isStarting, setIsStarting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Real-time clock update
  useEffect(() => {
    if (!activeTimers.some((t) => t.isRunning)) return;
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimers]);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [activeRes, histRes, summaryRes, projRes, catRes] = await Promise.all([
        api.get('/daily-work-logging/employee/timer/active'),
        api.get('/daily-work-logging/employee/timer/history'),
        api.get('/daily-work-logging/employee/timer/daily-summary'),
        api.get('/daily-work-logging/employee/timesheet/projects'),
        api.get('/daily-work-logging/employee/timesheet/categories'),
      ]);
      setActiveTimers(Array.isArray(activeRes.data) ? activeRes.data : activeRes.data?.data || []);
      setHistory(Array.isArray(histRes.data) ? histRes.data : histRes.data?.data || []);
      const sumData = summaryRes.data?.data || summaryRes.data;
      if (sumData) {
        setDailySummary({
          totalTracked: sumData.totalTracked || 0,
          totalEntries: sumData.totalEntries || 0,
          billableTracked: sumData.billableTracked || 0,
        });
      }
      setProjects(Array.isArray(projRes.data) ? projRes.data : projRes.data?.data || []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data?.data || []);
    } catch {
      setError('Failed to load timer data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getElapsedSeconds = (timer: ActiveTimer): number => {
    if (!timer.isRunning) return 0;
    const started = new Date(timer.startedAt).getTime();
    const elapsed = Math.floor((now.getTime() - started) / 1000);
    return Math.max(0, elapsed - timer.pausedDuration);
  };

  const handleStart = async () => {
    if (!newTimer.projectId) {
      setError('Please select a project.');
      return;
    }
    setError(null);
    setIsStarting(true);
    try {
      const res = await api.post('/daily-work-logging/employee/timer/start', newTimer);
      const created = res.data?.data || res.data;
      setActiveTimers((prev) => [...prev, created]);
      setNewTimer({ projectId: '', taskCategory: '', description: '', billable: true });
      setSuccess('Timer started.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to start timer.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      await api.post(`/daily-work-logging/employee/timer/${id}/stop`);
      setActiveTimers((prev) => prev.filter((t) => t.id !== id));
      await loadData();
      setSuccess('Timer stopped.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to stop timer.');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePause = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      await api.post(`/daily-work-logging/employee/timer/${id}/pause`);
      setActiveTimers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isRunning: false } : t))
      );
      setSuccess('Timer paused.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to pause timer.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleResume = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      await api.post(`/daily-work-logging/employee/timer/${id}/resume`);
      setActiveTimers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isRunning: true } : t))
      );
      setSuccess('Timer resumed.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to resume timer.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConvert = async (id: string) => {
    setConvertingId(id);
    setError(null);
    try {
      await api.post(`/daily-work-logging/employee/timer/${id}/convert`);
      setHistory((prev) =>
        prev.map((h) => (h.id === id ? { ...h, converted: true } : h))
      );
      setSuccess('Timer session converted to timesheet entry.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to convert timer session.');
    } finally {
      setConvertingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading timer...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Work Timer
        </h2>
        <p className="text-sm text-text-muted">Track time in real-time and convert to timesheet entries.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Daily Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Total Tracked Today</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{formatDurationShort(dailySummary.totalTracked)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Billable Tracked</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{formatDurationShort(dailySummary.billableTracked)}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Sessions Today</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{dailySummary.totalEntries}</p>
        </div>
      </div>

      {/* Active Timers */}
      {activeTimers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text mb-3">Active Timers</h3>
          <div className="space-y-3">
            {activeTimers.map((timer) => {
              const elapsed = getElapsedSeconds(timer);
              return (
                <div key={timer.id} className="bg-card border-2 border-primary/30 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-text">{timer.projectName}</span>
                      {timer.taskCategory && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-background text-text-muted border border-border">
                          {timer.taskCategory}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        timer.billable ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {timer.billable ? 'Billable' : 'Non-Billable'}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${timer.isRunning ? 'text-green-600' : 'text-yellow-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${timer.isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                      <span className="text-xs font-medium">{timer.isRunning ? 'Running' : 'Paused'}</span>
                    </div>
                  </div>

                  {timer.description && (
                    <p className="text-sm text-text-muted mb-3">{timer.description}</p>
                  )}

                  {/* Timer Display */}
                  <div className="flex items-center justify-between">
                    <div className="text-4xl font-mono font-bold text-text tracking-wider">
                      {formatDuration(elapsed)}
                    </div>
                    <div className="flex items-center gap-2">
                      {timer.isRunning ? (
                        <button
                          type="button"
                          onClick={() => handlePause(timer.id)}
                          disabled={processingId === timer.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                        >
                          {processingId === timer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                          Pause
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleResume(timer.id)}
                          disabled={processingId === timer.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {processingId === timer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                          Resume
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStop(timer.id)}
                        disabled={processingId === timer.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {processingId === timer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                        Stop
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Start New Timer */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <Play className="h-4 w-4 text-green-600" />
          Start New Timer
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Project *</label>
            <select
              value={newTimer.projectId}
              onChange={(e) => setNewTimer({ ...newTimer, projectId: e.target.value })}
              className={selectClassName}
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Task Category</label>
            <select
              value={newTimer.taskCategory}
              onChange={(e) => setNewTimer({ ...newTimer, taskCategory: e.target.value })}
              className={selectClassName}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
            <input
              type="text"
              value={newTimer.description}
              onChange={(e) => setNewTimer({ ...newTimer, description: e.target.value })}
              className={inputClassName}
              placeholder="What are you working on?"
            />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={newTimer.billable}
                onChange={(e) => setNewTimer({ ...newTimer, billable: e.target.checked })}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text">Billable</span>
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={handleStart}
          disabled={isStarting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          START
        </button>
      </div>

      {/* Timer History */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Timer History</h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Project</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Category</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Start</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">End</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Duration</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Billable</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((entry) => (
                <tr key={entry.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{entry.projectName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{entry.taskCategory || '--'}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(entry.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(entry.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-text font-mono font-medium">
                    {formatDuration(entry.duration)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{entry.billable ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    {entry.converted ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        Converted
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConvert(entry.id)}
                        disabled={convertingId === entry.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                      >
                        {convertingId === entry.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ArrowRight className="h-3 w-3" />
                        )}
                        Convert to Entry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No timer history for today.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
