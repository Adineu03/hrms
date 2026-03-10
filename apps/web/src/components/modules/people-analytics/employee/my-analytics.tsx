'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Calendar, Clock, Star, Briefcase, BookOpen } from 'lucide-react';
import type { EmployeeAnalyticsSummary } from '@hrms/shared';

export default function MyAnalytics() {
  const [data, setData] = useState<EmployeeAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/people-analytics/employee/my-analytics')
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading your analytics...</div>;

  const metrics = data ? [
    { label: 'Leave Balance', value: `${data.leaveBalance} days`, icon: Calendar, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Attendance Rate', value: `${data.attendanceRate}%`, icon: Clock, color: 'text-green-600 bg-green-50' },
    { label: 'Performance Score', value: `${data.performanceScore}/5`, icon: Star, color: 'text-amber-600 bg-amber-50' },
    { label: 'Tenure', value: `${data.tenureMonths} months`, icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
    { label: 'Training Hours', value: `${data.trainingHoursCompleted}h`, icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">{m.label}</span>
              <span className={`p-2 rounded-lg ${m.color}`}><m.icon className="h-3.5 w-3.5" /></span>
            </div>
            <div className="text-xl font-bold text-[#2c2c2c]">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-[#2c2c2c] mb-4">Career Milestones</h3>
        <p className="text-sm text-gray-400">Your career timeline and key milestones will appear here as your tenure grows.</p>
      </div>
    </div>
  );
}
