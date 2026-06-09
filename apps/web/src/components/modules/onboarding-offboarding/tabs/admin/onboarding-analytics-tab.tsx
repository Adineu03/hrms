'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  BarChart3,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

interface OnboardingMetrics {
  avgOnboardingDays: number;
  activeOnboardings: number;
  completionRate: number;
  bottleneckTasks: number;
}

interface BottleneckTask {
  title: string;
  taskType: string;
  taskOwner: string;
  totalAssigned: number;
  pendingCount: number;
  completedCount: number;
  completionRate: number;
}

export default function OnboardingAnalyticsTab() {
  const [metrics, setMetrics] = useState<OnboardingMetrics | null>(null);
  const [bottlenecks, setBottlenecks] = useState<BottleneckTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsRes, bottleneckRes] = await Promise.all([
        api.get('/onboarding-offboarding/admin/onboarding-analytics/overview').catch(() => ({ data: null })),
        api.get('/onboarding-offboarding/admin/onboarding-analytics/bottlenecks').catch(() => ({ data: [] })),
      ]);

      const overview = metricsRes.data?.data || metricsRes.data;
      const rawBottlenecks: any[] = Array.isArray(bottleneckRes.data)
        ? bottleneckRes.data
        : bottleneckRes.data?.data || [];
      const mappedBottlenecks: BottleneckTask[] = rawBottlenecks.map((b) => ({
        title: b.title,
        taskType: b.taskType ?? b.task_type ?? '',
        taskOwner: b.taskOwner ?? b.task_owner ?? '',
        totalAssigned: Number(b.totalAssigned ?? b.total_assigned ?? 0),
        pendingCount: Number(b.pendingCount ?? b.pending_count ?? 0),
        completedCount: Number(b.completedCount ?? b.completed_count ?? 0),
        completionRate: Number(b.completionRate ?? b.completion_rate ?? 0),
      }));
      setBottlenecks(mappedBottlenecks);

      setMetrics(
        overview
          ? {
              avgOnboardingDays: overview.avgOnboardingDays ?? overview.averageCompletionDays ?? 0,
              activeOnboardings: overview.activeOnboardings ?? 0,
              completionRate:
                overview.completionRate ?? overview.averageProgressPercentage ?? 0,
              bottleneckTasks:
                overview.bottleneckTasks ?? mappedBottlenecks.filter((b) => b.pendingCount > 0).length,
            }
          : null,
      );
    } catch {
      setError('Failed to load onboarding analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderProgressBar = (percent: number, color: string = 'bg-primary') => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Onboarding Analytics
        </h2>
        <p className="text-sm text-text-muted">Monitor onboarding metrics, completion rates, and bottlenecks.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Metric Cards */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Avg Onboarding Days</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{metrics.avgOnboardingDays} <span className="text-sm font-normal">days</span></p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Active Onboardings</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{metrics.activeOnboardings}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Completion Rate</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{metrics.completionRate}%</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-700 uppercase tracking-wider">Bottleneck Tasks</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{metrics.bottleneckTasks}</p>
          </div>
        </div>
      )}

      {/* Bottleneck Tasks */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Task Bottlenecks</h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Task</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Owner</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Pending</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Completed</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-44">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bottlenecks.map((item, idx) => (
                <tr key={`${item.title}-${idx}`} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{item.title}</td>
                  <td className="px-4 py-3 text-sm text-text-muted capitalize">
                    {(item.taskType || '').replace(/_/g, ' ') || '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted capitalize">
                    {(item.taskOwner || '').replace(/_/g, ' ') || '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {item.pendingCount} / {item.totalAssigned}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{item.completedCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        {renderProgressBar(
                          item.completionRate,
                          item.completionRate >= 80 ? 'bg-green-500' : item.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                      </div>
                      <span className="text-xs font-medium text-text w-10 text-right">
                        {Math.round(item.completionRate)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {bottlenecks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No onboarding data available yet.</p>
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
