'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  BarChart3,
  Users,
  Target,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface AnalyticsData {
  performanceDistribution: { rating: string; count: number; percentage: number }[];
  departmentComparison: { department: string; avgRating: number; totalEmployees: number }[];
  goalAchievementRate: number;
  reviewCompletionRate: number;
  totalReviews: number;
  completedReviews: number;
  totalGoals: number;
  completedGoals: number;
  yoyTrend: { year: string; avgRating: number }[];
}

const RATING_COLORS: Record<string, string> = {
  'Outstanding': 'bg-green-500',
  'Exceeds Expectations': 'bg-emerald-400',
  'Meets Expectations': 'bg-blue-400',
  'Needs Improvement': 'bg-yellow-400',
  'Unsatisfactory': 'bg-red-400',
  '5': 'bg-green-500',
  '4': 'bg-emerald-400',
  '3': 'bg-blue-400',
  '2': 'bg-yellow-400',
  '1': 'bg-red-400',
};

export default function PerformanceAnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [distRes, deptRes, goalRes, reviewRes, trendRes] = await Promise.all([
        api.get('/performance-growth/admin/analytics/distribution').catch(() => ({ data: [] })),
        api.get('/performance-growth/admin/analytics/department-comparison').catch(() => ({ data: [] })),
        api.get('/performance-growth/admin/analytics/goal-achievement').catch(() => ({ data: {} })),
        api.get('/performance-growth/admin/analytics/review-completion').catch(() => ({ data: {} })),
        api.get('/performance-growth/admin/analytics/trends').catch(() => ({ data: [] })),
      ]);
      const dist = Array.isArray(distRes.data) ? distRes.data : distRes.data?.data || [];
      const dept = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.data || [];
      const goal = goalRes.data?.data || goalRes.data || {};
      const review = reviewRes.data?.data || reviewRes.data || {};
      const trends = Array.isArray(trendRes.data) ? trendRes.data : trendRes.data?.data || [];
      setData({
        performanceDistribution: dist,
        departmentComparison: dept,
        goalAchievementRate: goal.goalAchievementRate ?? goal.rate ?? 0,
        totalGoals: goal.totalGoals ?? goal.total ?? 0,
        completedGoals: goal.completedGoals ?? goal.completed ?? 0,
        reviewCompletionRate: review.reviewCompletionRate ?? review.rate ?? 0,
        totalReviews: review.totalReviews ?? review.total ?? 0,
        completedReviews: review.completedReviews ?? review.completed ?? 0,
        yoyTrend: trends,
      });
    } catch {
      setError('Failed to load performance analytics.');
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
        <span className="ml-2 text-sm text-text-muted">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
      </div>
    );
  }

  const analytics = data || {
    performanceDistribution: [],
    departmentComparison: [],
    goalAchievementRate: 0,
    reviewCompletionRate: 0,
    totalReviews: 0,
    completedReviews: 0,
    totalGoals: 0,
    completedGoals: 0,
    yoyTrend: [],
  };

  const maxDistCount = Math.max(...(analytics.performanceDistribution.map((d) => d.count) || [1]), 1);
  const maxDeptRating = Math.max(...(analytics.departmentComparison.map((d) => d.avgRating) || [5]), 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Analytics
        </h2>
        <p className="text-sm text-text-muted">Organization-wide performance insights and trends.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Review Completion</p>
          </div>
          <p className="text-2xl font-bold text-text">{analytics.reviewCompletionRate}%</p>
          <p className="text-xs text-text-muted mt-1">{analytics.completedReviews} of {analytics.totalReviews} reviews</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-blue-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Goal Achievement</p>
          </div>
          <p className="text-2xl font-bold text-text">{analytics.goalAchievementRate}%</p>
          <p className="text-xs text-text-muted mt-1">{analytics.completedGoals} of {analytics.totalGoals} goals</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-purple-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Total Reviews</p>
          </div>
          <p className="text-2xl font-bold text-text">{analytics.totalReviews}</p>
          <p className="text-xs text-text-muted mt-1">This cycle</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Total Goals</p>
          </div>
          <p className="text-2xl font-bold text-text">{analytics.totalGoals}</p>
          <p className="text-xs text-text-muted mt-1">Organization-wide</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Distribution */}
        <div className="bg-background border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Performance Distribution</h3>
          {analytics.performanceDistribution.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">No distribution data available.</p>
          ) : (
            <div className="space-y-3">
              {analytics.performanceDistribution.map((item) => (
                <div key={item.rating} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text font-medium">{item.rating}</span>
                    <span className="text-xs text-text-muted">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${RATING_COLORS[item.rating] || 'bg-primary'}`}
                      style={{ width: `${(item.count / maxDistCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Department Comparison */}
        <div className="bg-background border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Department Comparison</h3>
          {analytics.departmentComparison.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">No department data available.</p>
          ) : (
            <div className="space-y-3">
              {analytics.departmentComparison.map((dept) => (
                <div key={dept.department} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text font-medium">{dept.department}</span>
                    <span className="text-xs text-text-muted">{dept.avgRating.toFixed(1)} avg ({dept.totalEmployees} employees)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-primary transition-all"
                      style={{ width: `${(dept.avgRating / maxDeptRating) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review Completion Progress */}
        <div className="bg-background border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Review Completion Progress</h3>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  className="text-primary"
                  strokeWidth="3"
                  strokeDasharray={`${analytics.reviewCompletionRate}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-text">{analytics.reviewCompletionRate}%</span>
              </div>
            </div>
          </div>
          <div className="text-center text-xs text-text-muted">
            {analytics.completedReviews} completed out of {analytics.totalReviews} total reviews
          </div>
        </div>

        {/* Year-over-Year Trend */}
        <div className="bg-background border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Year-over-Year Trend</h3>
          {analytics.yoyTrend.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">No trend data available yet.</p>
          ) : (
            <div className="space-y-3">
              {analytics.yoyTrend.map((year, idx) => (
                <div key={year.year} className="flex items-center gap-3">
                  <span className="text-xs text-text font-medium w-12">{year.year}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-primary transition-all"
                      style={{ width: `${(year.avgRating / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-8">{year.avgRating.toFixed(1)}</span>
                  {idx > 0 && analytics.yoyTrend[idx - 1] && (
                    <span className={`text-[10px] font-medium ${year.avgRating >= analytics.yoyTrend[idx - 1].avgRating ? 'text-green-600' : 'text-red-600'}`}>
                      {year.avgRating >= analytics.yoyTrend[idx - 1].avgRating ? '+' : ''}{(year.avgRating - analytics.yoyTrend[idx - 1].avgRating).toFixed(1)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
