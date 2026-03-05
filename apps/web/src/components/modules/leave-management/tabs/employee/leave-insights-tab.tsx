'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Target,
  Activity,
  Calendar,
} from 'lucide-react';

interface InsightSummary {
  totalEntitled: number;
  totalUsed: number;
  totalPending: number;
  totalAvailable: number;
  utilizationPercent: number;
  averagePerMonth: number;
  attendanceDays: number;
  leaveDays: number;
}

interface TypeBreakdown {
  leaveTypeId: string;
  leaveTypeName: string;
  color: string;
  used: number;
  entitled: number;
  percent: number;
}

interface MonthlyTrend {
  month: string;
  monthName: string;
  daysUsed: number;
}

interface Projection {
  leaveTypeName: string;
  currentRate: number;
  projectedExhaustMonth: string | null;
  projectedExhaustYear: number | null;
  remainingDays: number;
}

interface HealthIndicator {
  status: 'green' | 'yellow' | 'red';
  label: string;
  message: string;
  usageRate: number;
}

export default function LeaveInsightsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<InsightSummary | null>(null);
  const [typeBreakdown, setTypeBreakdown] = useState<TypeBreakdown[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [healthIndicator, setHealthIndicator] = useState<HealthIndicator | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sumRes, typeRes, trendRes, projRes, healthRes] = await Promise.all([
        api.get('/leave-management/employee/insights/summary'),
        api.get('/leave-management/employee/insights/type-breakdown').catch(() => ({ data: [] })),
        api.get('/leave-management/employee/insights/monthly-trends').catch(() => ({ data: [] })),
        api.get('/leave-management/employee/insights/projection').catch(() => ({ data: [] })),
        api.get('/leave-management/employee/insights/health-indicator').catch(() => ({ data: null })),
      ]);

      setSummary(sumRes.data);
      setTypeBreakdown(Array.isArray(typeRes.data) ? typeRes.data : typeRes.data?.data || []);
      setMonthlyTrends(Array.isArray(trendRes.data) ? trendRes.data : trendRes.data?.data || []);
      setProjections(Array.isArray(projRes.data) ? projRes.data : projRes.data?.data || []);
      setHealthIndicator(healthRes.data);
    } catch {
      setError('Failed to load leave insights.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  const utilizationPct = summary?.utilizationPercent ?? 0;
  const maxTrendDays = Math.max(...monthlyTrends.map((t) => t.daysUsed), 1);

  const HEALTH_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Leave Insights</h2>
      </div>

      {/* Top Row: Utilization + Health + Avg Per Month */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Utilization Card with Circular Progress */}
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col items-center">
          <h3 className="text-sm font-medium text-text-muted mb-3">Leave Utilization</h3>
          <div className="relative">
            <svg className="w-24 h-24" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#4F46E5"
                strokeWidth="8"
                strokeDasharray={`${utilizationPct * 2.83} 283`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-text">{Math.round(utilizationPct)}%</span>
            </div>
          </div>
          <div className="mt-3 text-center text-xs text-text-muted">
            <span>{summary?.totalUsed ?? 0} used</span>
            <span className="mx-1">/</span>
            <span>{summary?.totalEntitled ?? 0} entitled</span>
          </div>
        </div>

        {/* Health Indicator */}
        {healthIndicator && (
          <div
            className={`${HEALTH_COLORS[healthIndicator.status]?.bg || 'bg-gray-50'} border ${
              HEALTH_COLORS[healthIndicator.status]?.border || 'border-gray-200'
            } rounded-lg p-5 flex flex-col items-center justify-center`}
          >
            <Activity
              className={`h-8 w-8 mb-2 ${
                HEALTH_COLORS[healthIndicator.status]?.text || 'text-gray-700'
              }`}
            />
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                HEALTH_COLORS[healthIndicator.status]?.text || 'text-gray-700'
              } ${HEALTH_COLORS[healthIndicator.status]?.bg || 'bg-gray-50'}`}
            >
              {healthIndicator.label}
            </span>
            <p
              className={`text-xs mt-2 text-center ${
                HEALTH_COLORS[healthIndicator.status]?.text || 'text-gray-600'
              }`}
            >
              {healthIndicator.message}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Usage rate: {Math.round(healthIndicator.usageRate)}%
            </p>
          </div>
        )}

        {/* Average Per Month + Attendance Correlation */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="text-center">
            <h3 className="text-sm font-medium text-text-muted mb-1">Avg Leave / Month</h3>
            <p className="text-3xl font-bold text-text">
              {summary?.averagePerMonth?.toFixed(1) ?? '0.0'}
            </p>
            <p className="text-xs text-text-muted">days per month</p>
          </div>
          <div className="border-t border-border pt-3">
            <h3 className="text-sm font-medium text-text-muted mb-2 text-center">Attendance</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-green-700">{summary?.attendanceDays ?? 0}</p>
                <p className="text-xs text-text-muted">Days Present</p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-700">{summary?.leaveDays ?? 0}</p>
                <p className="text-xs text-text-muted">Days on Leave</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Type Breakdown */}
      {typeBreakdown.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-text-muted" />
            <h3 className="text-base font-semibold text-text">Leave Type Breakdown</h3>
          </div>
          <div className="space-y-3">
            {typeBreakdown.map((tb) => (
              <div key={tb.leaveTypeId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tb.color || '#4F46E5' }}
                    />
                    <span className="font-medium text-text">{tb.leaveTypeName}</span>
                  </div>
                  <span className="text-text-muted">
                    {tb.used} / {tb.entitled} days ({Math.round(tb.percent)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, tb.percent)}%`,
                      backgroundColor: tb.color || '#4F46E5',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Trends (Bar Chart using divs) */}
      {monthlyTrends.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-text-muted" />
            <h3 className="text-base font-semibold text-text">Monthly Trends</h3>
          </div>
          <div className="flex items-end gap-2 h-40">
            {monthlyTrends.map((trend) => {
              const heightPct = maxTrendDays > 0 ? (trend.daysUsed / maxTrendDays) * 100 : 0;
              return (
                <div
                  key={trend.month}
                  className="flex-1 flex flex-col items-center justify-end gap-1"
                >
                  <span className="text-xs text-text font-medium">{trend.daysUsed}</span>
                  <div
                    className="w-full bg-primary/80 rounded-t-sm min-h-[2px] transition-all"
                    style={{ height: `${Math.max(2, heightPct)}%` }}
                  />
                  <span className="text-[10px] text-text-muted mt-1">
                    {trend.monthName?.substring(0, 3) || trend.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Projections */}
      {projections.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-text-muted" />
            <h3 className="text-base font-semibold text-text">Leave Projections</h3>
          </div>
          <div className="space-y-3">
            {projections.map((proj, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-text">{proj.leaveTypeName}</p>
                  <p className="text-xs text-text-muted">
                    {proj.remainingDays} day{proj.remainingDays !== 1 ? 's' : ''} remaining
                  </p>
                </div>
                <div className="text-right">
                  {proj.projectedExhaustMonth ? (
                    <div>
                      <p className="text-sm font-semibold text-red-600">
                        Exhausts by {proj.projectedExhaustMonth} {proj.projectedExhaustYear}
                      </p>
                      <p className="text-xs text-text-muted">
                        Rate: {proj.currentRate.toFixed(1)} days/month
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-green-700 font-medium">
                      Sufficient for the year
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!summary && typeBreakdown.length === 0 && monthlyTrends.length === 0 && (
        <div className="text-center py-8">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No insight data available yet.</p>
          <p className="text-xs text-text-muted mt-1">
            Insights will appear once you have leave history.
          </p>
        </div>
      )}
    </div>
  );
}
