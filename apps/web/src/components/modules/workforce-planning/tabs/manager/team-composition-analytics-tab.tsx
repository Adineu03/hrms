'use client';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, X, PieChart } from 'lucide-react';
import { api } from '@/lib/api';

interface CompositionData {
  promotionsThisCycle?: number;
  avgTenureMonths?: number;
  totalTeamSize?: number;
}

interface GradeDistribution {
  gradeCode: string;
  gradeLevel?: number;
  count: number;
  percent?: number;
}

export default function TeamCompositionAnalyticsTab() {
  const [composition, setComposition] = useState<CompositionData | null>(null);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [compRes, gradeRes] = await Promise.allSettled([
        api.get('/workforce-planning/manager/team-composition'),
        api.get('/workforce-planning/manager/team-composition/grade-distribution'),
      ]);
      if (compRes.status === 'fulfilled') setComposition(compRes.value.data?.data || compRes.value.data || null);
      if (gradeRes.status === 'fulfilled') setGradeDistribution(gradeRes.value.data?.data || gradeRes.value.data || []);
    } catch {
      setError('Failed to load team composition data');
    } finally {
      setLoading(false);
    }
  };

  const totalCount = gradeDistribution.reduce((sum, g) => sum + (g.count || 0), 0);
  const maxCount = Math.max(...gradeDistribution.map((g) => g.count || 0), 1);

  const formatTenure = (months?: number) => {
    if (months == null) return '—';
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return `${m}m`;
    if (m === 0) return `${y}y`;
    return `${y}y ${m}m`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading team composition...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Team Size</p>
          <p className="text-2xl font-bold text-indigo-600">{composition?.totalTeamSize ?? totalCount ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Promotions This Cycle</p>
          <p className="text-2xl font-bold text-green-600">{composition?.promotionsThisCycle ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Avg Tenure</p>
          <p className="text-2xl font-bold text-blue-600">{formatTenure(composition?.avgTenureMonths)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-4 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-indigo-600" />
          Grade Distribution
        </h2>
        {gradeDistribution.length === 0 ? (
          <div className="text-center py-8">
            <PieChart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No grade distribution data available.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gradeDistribution.map((grade) => {
              const pct = totalCount > 0 ? ((grade.count / totalCount) * 100).toFixed(1) : '0.0';
              const barWidth = maxCount > 0 ? (grade.count / maxCount) * 100 : 0;
              return (
                <div key={grade.gradeCode} className="flex items-center gap-3">
                  <div className="w-14 text-right">
                    <span className="text-xs font-mono font-medium text-indigo-700">{grade.gradeCode}</span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                    <div
                      className="h-5 rounded-full bg-indigo-400"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="w-20 flex justify-end gap-1">
                    <span className="text-sm font-semibold text-[#2c2c2c]">{grade.count}</span>
                    <span className="text-xs text-gray-500">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
