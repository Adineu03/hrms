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

interface RecentOnboarding {
  id: string;
  employeeName: string;
  department: string;
  startDate: string;
  completionPercent: number;
  status: string;
  daysElapsed: number;
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-50 text-yellow-700',
};

export default function OnboardingAnalyticsTab() {
  const [metrics, setMetrics] = useState<OnboardingMetrics | null>(null);
  const [recentOnboardings, setRecentOnboardings] = useState<RecentOnboarding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsRes, recentRes] = await Promise.all([
        api.get('/onboarding-offboarding/admin/analytics/onboarding-metrics'),
        api.get('/onboarding-offboarding/admin/analytics/recent-onboardings'),
      ]);
      setMetrics(metricsRes.data?.data || metricsRes.data);
      setRecentOnboardings(Array.isArray(recentRes.data) ? recentRes.data : recentRes.data?.data || []);
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

      {/* Recent Onboardings */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Recent Onboardings</h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Start Date</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Days</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-40">Progress</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOnboardings.map((item) => (
                <tr key={item.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{item.employeeName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{item.department}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {item.startDate ? new Date(item.startDate).toLocaleDateString() : '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{item.daysElapsed}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        {renderProgressBar(
                          item.completionPercent,
                          item.completionPercent >= 80 ? 'bg-green-500' : item.completionPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                      </div>
                      <span className="text-xs font-medium text-text w-10 text-right">{item.completionPercent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[item.status] || 'bg-gray-100 text-gray-600'}`}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {recentOnboardings.length === 0 && (
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
