'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TrendingDown, Users2, GitMerge } from 'lucide-react';

export default function WorkforceAnalytics() {
  const [attrition, setAttrition] = useState<{ voluntary: number; involuntary: number; regrettable: number } | null>(null);
  const [diversity, setDiversity] = useState<{ gender: { male: number; female: number; other: number } } | null>(null);
  const [funnel, setFunnel] = useState<{ applied: number; hired: number; timeToHireDays: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/people-analytics/admin/workforce-analytics/attrition'),
      api.get('/people-analytics/admin/workforce-analytics/diversity'),
      api.get('/people-analytics/admin/workforce-analytics/hiring-funnel'),
    ]).then(([a, d, f]) => {
      setAttrition(a.data.data);
      setDiversity(d.data.data);
      setFunnel(f.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading workforce analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attrition */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-[#2c2c2c]">Attrition Analysis</h3>
          </div>
          {attrition && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold text-red-600">{attrition.voluntary}%</div><div className="text-xs text-gray-500 mt-1">Voluntary</div></div>
              <div><div className="text-2xl font-bold text-orange-500">{attrition.involuntary}%</div><div className="text-xs text-gray-500 mt-1">Involuntary</div></div>
              <div><div className="text-2xl font-bold text-amber-500">{attrition.regrettable}%</div><div className="text-xs text-gray-500 mt-1">Regrettable</div></div>
            </div>
          )}
        </div>

        {/* Diversity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users2 className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold text-[#2c2c2c]">Diversity &amp; Inclusion</h3>
          </div>
          {diversity && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold text-indigo-600">{diversity.gender.male}%</div><div className="text-xs text-gray-500 mt-1">Male</div></div>
              <div><div className="text-2xl font-bold text-pink-500">{diversity.gender.female}%</div><div className="text-xs text-gray-500 mt-1">Female</div></div>
              <div><div className="text-2xl font-bold text-purple-500">{diversity.gender.other}%</div><div className="text-xs text-gray-500 mt-1">Other</div></div>
            </div>
          )}
        </div>
      </div>

      {/* Hiring Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitMerge className="h-5 w-5 text-green-500" />
          <h3 className="font-semibold text-[#2c2c2c]">Hiring Funnel</h3>
        </div>
        {funnel && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-center"><div className="text-xl font-bold text-[#2c2c2c]">{funnel.applied}</div><div className="text-xs text-gray-500">Applied</div></div>
            <div className="text-gray-300">→</div>
            <div className="text-center"><div className="text-xl font-bold text-indigo-600">{funnel.hired}</div><div className="text-xs text-gray-500">Hired</div></div>
            <div className="ml-auto text-sm text-gray-500">Time to Hire: <span className="font-semibold text-[#2c2c2c]">{funnel.timeToHireDays} days</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
