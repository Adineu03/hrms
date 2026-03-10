'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import type { PeerBenchmarkData } from '@hrms/shared';

export default function PeerBenchmarks() {
  const [data, setData] = useState<PeerBenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/people-analytics/employee/peer-benchmarks')
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading benchmarks...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
        <p className="text-sm text-indigo-700">{data?.note}</p>
      </div>

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Attendance Rate', mine: `${data.attendance.mine}%`, avg: `${data.attendance.deptAvg}%`, diff: data.attendance.difference },
            { label: 'Leave Utilization', mine: `${data.leaveUtilization.mine}%`, avg: `${data.leaveUtilization.deptAvg}%`, diff: data.leaveUtilization.difference },
            { label: 'Performance Score', mine: `${data.performanceScore.mine}`, avg: `${data.performanceScore.deptAvg}`, diff: data.performanceScore.difference },
          ].map((b) => {
            const isPositive = b.diff.startsWith('+');
            const isNeutral = b.diff === '0' || b.diff === '0%';
            return (
              <div key={b.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h4 className="text-sm font-medium text-gray-500 mb-4">{b.label}</h4>
                <div className="flex items-end justify-between">
                  <div><div className="text-2xl font-bold text-[#2c2c2c]">{b.mine}</div><div className="text-xs text-gray-400 mt-1">You</div></div>
                  <div className="text-right"><div className="text-lg text-gray-400">{b.avg}</div><div className="text-xs text-gray-400 mt-1">Dept Avg</div></div>
                </div>
                <div className={`mt-3 flex items-center gap-1 text-sm font-medium ${isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-500'}`}>
                  {isNeutral ? <Minus className="h-4 w-4" /> : isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {b.diff} vs dept average
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
