'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  BarChart3,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

interface AnalyticsData {
  totalCourses: number;
  totalEnrollments: number;
  avgCompletionRate: number;
  totalHoursLogged: number;
  completionByDepartment: { department: string; completionRate: number; enrollments: number }[];
  popularCourses: { courseTitle: string; enrollments: number; completionRate: number; avgRating: number }[];
  budgetUtilization: { department: string; allocated: number; spent: number; utilization: number }[];
}

export default function ReportingAnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [completionRes, engagementRes, popularRes, budgetRes] = await Promise.all([
        api.get('/learning-development/admin/analytics/completion-rates').catch(() => ({ data: {} })),
        api.get('/learning-development/admin/analytics/engagement').catch(() => ({ data: {} })),
        api.get('/learning-development/admin/analytics/popular-content').catch(() => ({ data: [] })),
        api.get('/learning-development/admin/analytics/budget-utilization').catch(() => ({ data: [] })),
      ]);
      const completion = completionRes.data?.data || completionRes.data || {};
      const engagement = engagementRes.data?.data || engagementRes.data || {};
      const popular = Array.isArray(popularRes.data) ? popularRes.data : popularRes.data?.data || [];
      const budget = Array.isArray(budgetRes.data) ? budgetRes.data : budgetRes.data?.data || [];
      setData({
        totalCourses: engagement.totalCourses || completion.totalCourses || 0,
        totalEnrollments: engagement.totalEnrollments || completion.totalEnrollments || 0,
        avgCompletionRate: completion.avgCompletionRate || completion.average || 0,
        totalHoursLogged: engagement.totalHoursLogged || 0,
        completionByDepartment: completion.byDepartment || completion.completionByDepartment || [],
        popularCourses: popular,
        budgetUtilization: budget,
      });
    } catch {
      setError('Failed to load analytics data.');
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
    totalCourses: 0,
    totalEnrollments: 0,
    avgCompletionRate: 0,
    totalHoursLogged: 0,
    completionByDepartment: [],
    popularCourses: [],
    budgetUtilization: [],
  };

  const maxDeptRate = Math.max(...(analytics.completionByDepartment.map((d) => d.completionRate) || [100]), 100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Reporting & Analytics
        </h2>
        <p className="text-sm text-text-muted">Organization-wide learning insights and metrics.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Total Courses</p>
          </div>
          <p className="text-2xl font-bold text-text">{analytics.totalCourses}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-purple-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Total Enrollments</p>
          </div>
          <p className="text-2xl font-bold text-text">{analytics.totalEnrollments}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Avg Completion Rate</p>
          </div>
          <p className="text-2xl font-bold text-text">{analytics.avgCompletionRate}%</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <p className="text-xs text-text-muted uppercase font-semibold">Total Hours Logged</p>
          </div>
          <p className="text-2xl font-bold text-text">{analytics.totalHoursLogged}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion by Department */}
        <div className="bg-background border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4" />
            Completion Rates by Department
          </h3>
          {analytics.completionByDepartment.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">No department data available.</p>
          ) : (
            <div className="space-y-3">
              {analytics.completionByDepartment.map((dept) => (
                <div key={dept.department} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text font-medium">{dept.department}</span>
                    <span className="text-xs text-text-muted">{dept.completionRate}% ({dept.enrollments} enrollments)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-primary transition-all"
                      style={{ width: `${(dept.completionRate / maxDeptRate) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular Courses */}
        <div className="bg-background border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
            <BookOpen className="h-4 w-4" />
            Popular Courses
          </h3>
          {analytics.popularCourses.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">No course data available.</p>
          ) : (
            <div className="space-y-2">
              {analytics.popularCourses.map((course, idx) => (
                <div key={course.courseTitle} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted w-5 text-center font-medium">#{idx + 1}</span>
                    <div>
                      <span className="text-sm text-text font-medium">{course.courseTitle}</span>
                      <p className="text-[10px] text-text-muted">{course.enrollments} enrollments</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text font-medium">{course.completionRate}%</p>
                    <p className="text-[10px] text-text-muted">
                      {course.avgRating > 0 ? `${course.avgRating.toFixed(1)} rating` : '--'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget Utilization */}
        <div className="bg-background border border-border rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4" />
            Budget Utilization by Department
          </h3>
          {analytics.budgetUtilization.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">No budget utilization data available.</p>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-card border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Department</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Allocated</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Spent</th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-2">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analytics.budgetUtilization.map((dept) => (
                    <tr key={dept.department} className="bg-card hover:bg-background/50 transition-colors">
                      <td className="px-4 py-2 text-sm text-text">{dept.department}</td>
                      <td className="px-4 py-2 text-sm text-text-muted">${dept.allocated.toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm text-text-muted">${dept.spent.toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${dept.utilization >= 80 ? 'bg-green-500' : dept.utilization >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(dept.utilization, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-muted">{dept.utilization}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
