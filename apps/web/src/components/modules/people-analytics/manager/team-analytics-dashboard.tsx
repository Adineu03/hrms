'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Users, TrendingDown, Calendar, Clock, BarChart3 } from 'lucide-react';
import type { TeamAnalyticsSummary } from '@hrms/shared';

export default function TeamAnalyticsDashboard() {
  const [data, setData] = useState<TeamAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/people-analytics/manager/team-analytics-dashboard')
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading team analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {data && [
          { label: 'Team Size', value: data.headcount.toString(), icon: Users, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Attrition', value: `${data.attritionRate}%`, icon: TrendingDown, color: 'text-red-600 bg-red-50' },
          { label: 'Leave Utilization', value: `${data.leaveUtilization}%`, icon: Calendar, color: 'text-amber-600 bg-amber-50' },
          { label: 'Attendance Rate', value: `${data.attendanceRate}%`, icon: Clock, color: 'text-green-600 bg-green-50' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{m.label}</span>
              <span className={`p-2 rounded-lg ${m.color}`}><m.icon className="h-4 w-4" /></span>
            </div>
            <div className="text-2xl font-bold text-[#2c2c2c]">{m.value}</div>
          </div>
        ))}
      </div>

      {data && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4"><BarChart3 className="h-5 w-5 text-indigo-500" /><h3 className="font-semibold text-[#2c2c2c]">Performance Distribution</h3></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Outstanding', value: data.performanceDistribution.outstanding, color: 'text-green-600' },
              { label: 'Exceeds', value: data.performanceDistribution.exceedsExpectations, color: 'text-indigo-600' },
              { label: 'Meets', value: data.performanceDistribution.meetsExpectations, color: 'text-amber-500' },
              { label: 'Needs Work', value: data.performanceDistribution.needsImprovement, color: 'text-red-500' },
            ].map((d) => (
              <div key={d.label}><div className={`text-2xl font-bold ${d.color}`}>{d.value}%</div><div className="text-xs text-gray-500 mt-1">{d.label}</div></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
