'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Target, Star, BookOpen } from 'lucide-react';

interface InsightData {
  goalCompletionRate: number;
  reviewCycleCompletion: number;
  avgPerformanceScore: number;
  totalGoals: number;
}

export default function PerformanceInsights() {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/people-analytics/manager/performance-insights')
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading performance insights...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data && [
          { label: 'Goal Completion', value: `${data.goalCompletionRate}%`, icon: Target, color: 'text-green-600 bg-green-50' },
          { label: 'Review Cycle Done', value: `${data.reviewCycleCompletion}%`, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Avg Score', value: `${data.avgPerformanceScore}/5`, icon: Star, color: 'text-amber-600 bg-amber-50' },
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
    </div>
  );
}
