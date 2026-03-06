'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  BarChart3,
  Clock,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface ProductivitySummary {
  totalHours: number;
  billableHours: number;
  billableRatio: number;
  utilization: number;
  avgHoursPerDay: number;
}

interface ProjectBreakdown {
  projectName: string;
  hours: number;
  percent: number;
  color: string;
}

interface CategoryBreakdown {
  category: string;
  hours: number;
  percent: number;
}

interface WeeklyTrend {
  day: string;
  hours: number;
  billableHours: number;
}

interface UtilizationData {
  myUtilization: number;
  teamAverage: number;
  myBillableRatio: number;
  teamBillableAvg: number;
}

const PROJECT_COLORS = [
  'bg-primary', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-teal-500', 'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500',
];

const CATEGORY_COLORS: Record<string, string> = {
  development: 'bg-blue-500',
  meeting: 'bg-purple-500',
  review: 'bg-orange-500',
  planning: 'bg-teal-500',
  testing: 'bg-green-500',
  documentation: 'bg-yellow-500',
  admin: 'bg-gray-400',
  other: 'bg-pink-500',
};

export default function ProductivityDashboardTab() {
  const [summary, setSummary] = useState<ProductivitySummary | null>(null);
  const [projectBreakdown, setProjectBreakdown] = useState<ProjectBreakdown[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([]);
  const [utilization, setUtilization] = useState<UtilizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [prodRes, catRes, trendRes, utilRes] = await Promise.all([
        api.get('/daily-work-logging/employee/productivity'),
        api.get('/daily-work-logging/employee/productivity/category-breakdown'),
        api.get('/daily-work-logging/employee/productivity/weekly-trend'),
        api.get('/daily-work-logging/employee/productivity/utilization'),
      ]);

      const prodData = prodRes.data?.data || prodRes.data;
      if (prodData) {
        setSummary({
          totalHours: prodData.totalHours || 0,
          billableHours: prodData.billableHours || 0,
          billableRatio: prodData.billableRatio || 0,
          utilization: prodData.utilization || 0,
          avgHoursPerDay: prodData.avgHoursPerDay || 0,
        });
        // Project breakdown may be part of the main response
        if (Array.isArray(prodData.projectBreakdown)) {
          setProjectBreakdown(
            prodData.projectBreakdown.map((p: ProjectBreakdown, i: number) => ({
              ...p,
              color: PROJECT_COLORS[i % PROJECT_COLORS.length],
            }))
          );
        }
      }

      const catData = Array.isArray(catRes.data) ? catRes.data : catRes.data?.data || [];
      setCategoryBreakdown(catData);

      const trendData = Array.isArray(trendRes.data) ? trendRes.data : trendRes.data?.data || [];
      setWeeklyTrend(trendData);

      const utilData = utilRes.data?.data || utilRes.data;
      if (utilData) {
        setUtilization({
          myUtilization: utilData.myUtilization || 0,
          teamAverage: utilData.teamAverage || 0,
          myBillableRatio: utilData.myBillableRatio || 0,
          teamBillableAvg: utilData.teamBillableAvg || 0,
        });
      }
    } catch {
      setError('Failed to load productivity data.');
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
        <span className="ml-2 text-sm text-text-muted">Loading productivity data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          My Productivity
        </h2>
        <p className="text-sm text-text-muted">View your productivity metrics, time breakdown, and trends.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Total Hours</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{summary.totalHours.toFixed(1)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Billable</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{summary.billableHours.toFixed(1)}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Billable %</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{summary.billableRatio.toFixed(0)}%</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-700 uppercase tracking-wider">Utilization</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{summary.utilization.toFixed(0)}%</p>
          </div>
          <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-teal-600" />
              <span className="text-xs font-medium text-teal-700 uppercase tracking-wider">Avg/Day</span>
            </div>
            <p className="text-2xl font-bold text-teal-700">{summary.avgHoursPerDay.toFixed(1)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Breakdown */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text mb-4">Time by Project</h3>
          {projectBreakdown.length > 0 ? (
            <div className="space-y-3">
              {projectBreakdown.map((p, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text">{p.projectName}</span>
                    <span className="text-xs text-text-muted">{p.hours.toFixed(1)}h ({p.percent.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${p.color || PROJECT_COLORS[i % PROJECT_COLORS.length]} h-3 rounded-full transition-all`}
                      style={{ width: `${p.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No project data available.</p>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text mb-4">Time by Category</h3>
          {categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {categoryBreakdown.map((c, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text capitalize">{c.category}</span>
                    <span className="text-xs text-text-muted">{c.hours.toFixed(1)}h ({c.percent.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${CATEGORY_COLORS[c.category] || 'bg-gray-400'} h-3 rounded-full transition-all`}
                      style={{ width: `${c.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No category data available.</p>
          )}
        </div>
      </div>

      {/* Weekly Trend */}
      {weeklyTrend.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text mb-4">Weekly Trend (Hours per Day)</h3>
          <div className="flex items-end gap-2 h-40">
            {weeklyTrend.map((d, i) => {
              const maxHours = Math.max(...weeklyTrend.map((t) => t.hours), 1);
              const height = (d.hours / maxHours) * 100;
              const billableHeight = (d.billableHours / maxHours) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-text">{d.hours.toFixed(1)}</span>
                  <div className="w-full flex flex-col items-center relative" style={{ height: '120px' }}>
                    <div className="absolute bottom-0 w-full max-w-[40px] flex flex-col">
                      <div
                        className="bg-gray-300 rounded-t"
                        style={{ height: `${height}%`, minHeight: d.hours > 0 ? '4px' : '0' }}
                      >
                        <div
                          className="bg-primary rounded-t"
                          style={{ height: `${billableHeight > 0 ? (billableHeight / height) * 100 : 0}%`, minHeight: d.billableHours > 0 ? '4px' : '0' }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-text-muted">{d.day}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary rounded" />
              <span>Billable</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-300 rounded" />
              <span>Non-Billable</span>
            </div>
          </div>
        </div>
      )}

      {/* Team Comparison */}
      {utilization && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text mb-4">My Performance vs Team Average</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text">Utilization</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">You</span>
                    <span className="text-xs font-medium text-text">{utilization.myUtilization.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${Math.min(100, utilization.myUtilization)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">Team Avg</span>
                    <span className="text-xs font-medium text-text">{utilization.teamAverage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-gray-400 h-2.5 rounded-full" style={{ width: `${Math.min(100, utilization.teamAverage)}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text">Billable Ratio</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">You</span>
                    <span className="text-xs font-medium text-text">{utilization.myBillableRatio.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, utilization.myBillableRatio)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">Team Avg</span>
                    <span className="text-xs font-medium text-text">{utilization.teamBillableAvg.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-gray-400 h-2.5 rounded-full" style={{ width: `${Math.min(100, utilization.teamBillableAvg)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
