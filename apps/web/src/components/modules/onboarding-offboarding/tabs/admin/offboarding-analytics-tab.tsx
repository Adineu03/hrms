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

// The exit-trends endpoint groups exits by department and returns aggregate
// counts (no per-employee rows). Render those grouped buckets.
interface ExitTrendGroup {
  groupName: string;
  totalExits: number;
  resignations: number;
  terminations: number;
  retirements: number;
  contractEnds: number;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function OffboardingAnalyticsTab() {
  const [metrics, setMetrics] = useState<OffboardingMetrics | null>(null);
  const [exitTrends, setExitTrends] = useState<ExitTrendGroup[]>([]);
  const [groupBy, setGroupBy] = useState<string>('department');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewRes, trendsRes, assetRes, interviewRes] = await Promise.all([
        api.get('/onboarding-offboarding/admin/offboarding-analytics/overview').catch(() => ({ data: null })),
        api.get('/onboarding-offboarding/admin/offboarding-analytics/exit-trends').catch(() => ({ data: null })),
        api.get('/onboarding-offboarding/admin/offboarding-analytics/asset-recovery').catch(() => ({ data: null })),
        api.get('/onboarding-offboarding/admin/offboarding-analytics/exit-interview-rates').catch(() => ({ data: null })),
      ]);

      const overview = overviewRes.data?.data ?? overviewRes.data ?? {};
      const asset = assetRes.data?.data ?? assetRes.data ?? {};
      const interview = interviewRes.data?.data ?? interviewRes.data ?? {};

      const assetSummary = asset.summary ?? asset ?? {};
      const totalOffboardings = num(assetSummary.total_offboardings ?? assetSummary.totalOffboardings);
      const settlementsCompleted = num(assetSummary.settlements_completed ?? assetSummary.settlementsCompleted);
      const assetRecoveryRate =
        totalOffboardings > 0 ? Math.round((settlementsCompleted / totalOffboardings) * 100) : 0;

      const interviewSummary = interview.summary ?? interview ?? {};
      const exitInterviewRate = Math.round(
        num(interviewSummary.completion_rate ?? interviewSummary.completionRate),
      );

      setMetrics({
        totalExits: num(overview.totalExits ?? overview.total_exits),
        avgProcessingDays: num(overview.averageProcessingDays ?? overview.avgProcessingDays),
        assetRecoveryRate,
        exitInterviewRate,
      });

      const trendsData = trendsRes.data ?? {};
      setGroupBy(trendsData.groupBy ?? 'department');
      const rawTrends: any[] = Array.isArray(trendsData)
        ? trendsData
        : Array.isArray(trendsData.data)
          ? trendsData.data
          : [];
      setExitTrends(
        rawTrends.map((t) => ({
          groupName: t.group_name ?? t.groupName ?? '--',
          totalExits: num(t.total_exits ?? t.totalExits),
          resignations: num(t.resignations),
          terminations: num(t.terminations),
          retirements: num(t.retirements),
          contractEnds: num(t.contract_ends ?? t.contractEnds),
        })),
      );
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
        <h3 className="text-sm font-semibold text-text mb-3 capitalize">
          Exit Trends by {(groupBy ?? 'department').replace(/_/g, ' ')}
        </h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 capitalize">{(groupBy ?? 'department').replace(/_/g, ' ')}</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Exits</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Resignations</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Terminations</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Retirements</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Contract Ends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {exitTrends.map((item, idx) => (
                <tr key={`${item.groupName}-${idx}`} className="bg-card hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-text font-medium">{item.groupName}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{item.totalExits}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{item.resignations}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{item.terminations}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{item.retirements}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{item.contractEnds}</td>
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
