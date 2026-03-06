'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  TrendingDown,
  Users,
  Clock,
  Package,
  MessageSquare,
  Inbox,
} from 'lucide-react';

interface OffboardingMetrics {
  totalExits: number;
  avgProcessingDays: number;
  assetRecoveryRate: number;
  exitInterviewRate: number;
}

interface ExitTrend {
  id: string;
  employeeName: string;
  department: string;
  exitType: string;
  lastWorkingDate: string;
  processingDays: number;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-50 text-yellow-700',
  delayed: 'bg-red-100 text-red-700',
};

const EXIT_TYPE_STYLES: Record<string, string> = {
  resignation: 'bg-blue-50 text-blue-700',
  termination: 'bg-red-50 text-red-700',
  retirement: 'bg-purple-50 text-purple-700',
  contract_end: 'bg-orange-50 text-orange-700',
  mutual_separation: 'bg-gray-100 text-gray-600',
};

export default function OffboardingAnalyticsTab() {
  const [metrics, setMetrics] = useState<OffboardingMetrics | null>(null);
  const [exitTrends, setExitTrends] = useState<ExitTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsRes, trendsRes] = await Promise.all([
        api.get('/onboarding-offboarding/admin/analytics/offboarding-metrics'),
        api.get('/onboarding-offboarding/admin/analytics/exit-trends'),
      ]);
      setMetrics(metricsRes.data?.data || metricsRes.data);
      setExitTrends(Array.isArray(trendsRes.data) ? trendsRes.data : trendsRes.data?.data || []);
    } catch {
      setError('Failed to load offboarding analytics.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <TrendingDown className="h-5 w-5" />
          Offboarding Analytics
        </h2>
        <p className="text-sm text-text-muted">Monitor exit trends, asset recovery, and interview completion metrics.</p>
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
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Total Exits</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{metrics.totalExits}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-700 uppercase tracking-wider">Avg Processing Days</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{metrics.avgProcessingDays} <span className="text-sm font-normal">days</span></p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Asset Recovery Rate</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{metrics.assetRecoveryRate}%</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Exit Interview Rate</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{metrics.exitInterviewRate}%</p>
          </div>
        </div>
      )}

      {/* Exit Trends Table */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Exit Trends</h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Exit Type</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Last Working Day</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Processing Days</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {exitTrends.map((item) => (
                <tr key={item.id} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{item.employeeName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{item.department}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${EXIT_TYPE_STYLES[item.exitType] || 'bg-gray-100 text-gray-600'}`}>
                      {item.exitType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {item.lastWorkingDate ? new Date(item.lastWorkingDate).toLocaleDateString() : '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">{item.processingDays}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[item.status] || 'bg-gray-100 text-gray-600'}`}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {exitTrends.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-muted">No exit trend data available yet.</p>
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
