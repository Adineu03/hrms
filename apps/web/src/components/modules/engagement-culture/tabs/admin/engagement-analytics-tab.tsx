'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { BarChart3, Loader2, AlertCircle, Inbox } from 'lucide-react';

interface DepartmentComparison {
  department: string;
  engagementScore: number;
  participationRate: number;
  trend: string;
}

interface ActionItem {
  id: string;
  title: string;
  priority: string;
  department: string;
  status: string;
}

interface AnalyticsData {
  enpsScore: number;
  overallEngagement: number;
  surveyParticipationRate: number;
  departments: DepartmentComparison[];
  actionItems: ActionItem[];
}

export default function EngagementAnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [enpsRes, scoresRes, deptRes] = await Promise.all([
        api.get('/engagement-culture/admin/analytics/enps'),
        api.get('/engagement-culture/admin/analytics/scores'),
        api.get('/engagement-culture/admin/analytics/department-comparison'),
      ]);

      const enpsData = enpsRes.data?.data || enpsRes.data || {};
      const scoresData = scoresRes.data?.data || scoresRes.data || {};
      const deptData = deptRes.data?.data || deptRes.data || {};

      setData({
        enpsScore: enpsData.enpsScore || enpsData.score || 0,
        overallEngagement: scoresData.overallEngagement || scoresData.overall || 0,
        surveyParticipationRate: scoresData.surveyParticipationRate || scoresData.participationRate || 0,
        departments: Array.isArray(deptData.departments) ? deptData.departments : Array.isArray(deptData) ? deptData : [],
        actionItems: Array.isArray(scoresData.actionItems) ? scoresData.actionItems : [],
      });
    } catch {
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-muted text-sm">No analytics data available.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Engagement Analytics</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">eNPS Score</p>
          <p className="text-2xl font-bold text-text">{data.enpsScore}</p>
          <p className="text-xs text-text-muted mt-1">
            {data.enpsScore >= 50 ? 'Excellent' : data.enpsScore >= 20 ? 'Good' : data.enpsScore >= 0 ? 'Fair' : 'Needs Attention'}
          </p>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Overall Engagement</p>
          <p className="text-2xl font-bold text-text">{data.overallEngagement}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full ${data.overallEngagement >= 70 ? 'bg-green-500' : data.overallEngagement >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(data.overallEngagement, 100)}%` }}
            />
          </div>
        </div>
        <div className="bg-background rounded-xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">Survey Participation Rate</p>
          <p className="text-2xl font-bold text-text">{data.surveyParticipationRate}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full ${data.surveyParticipationRate >= 70 ? 'bg-green-500' : data.surveyParticipationRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(data.surveyParticipationRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Department Comparison */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Department Comparison</h3>
        {data.departments.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No department data available.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.departments.map((dept, idx) => (
              <div key={idx} className="bg-background rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text">{dept.department}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-text-muted">
                      Participation: {dept.participationRate}%
                    </span>
                    <span className={`text-xs font-medium ${
                      dept.trend === 'up' ? 'text-green-600' : dept.trend === 'down' ? 'text-red-600' : 'text-text-muted'
                    }`}>
                      {dept.trend === 'up' ? 'Trending Up' : dept.trend === 'down' ? 'Trending Down' : 'Stable'}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${dept.engagementScore >= 70 ? 'bg-green-500' : dept.engagementScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(dept.engagementScore, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">Engagement Score: {dept.engagementScore}%</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Items */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Action Items</h3>
        {data.actionItems.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No action items at this time.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Title</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Priority</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.actionItems.map((item) => (
                  <tr key={item.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{item.department}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.priority === 'high' ? 'bg-red-100 text-red-700' : item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' : item.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
