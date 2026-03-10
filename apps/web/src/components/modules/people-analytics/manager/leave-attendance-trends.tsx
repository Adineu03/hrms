'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Calendar, AlertCircle } from 'lucide-react';

interface TrendsData {
  leaveTypeBreakdown: { type: string; days: number }[];
  attendanceRateVsOrg: { team: number; org: number };
  unplannedAbsences: number;
}

export default function LeaveAttendanceTrends() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/people-analytics/manager/leave-attendance-trends')
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading trends...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4"><Calendar className="h-5 w-5 text-indigo-500" /><h3 className="font-semibold text-[#2c2c2c]">Leave Type Breakdown</h3></div>
              <div className="space-y-3">
                {data.leaveTypeBreakdown.map((lt) => (
                  <div key={lt.type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">{lt.type}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-100 rounded-full h-2">
                        <div className="bg-indigo-400 h-2 rounded-full" style={{ width: `${Math.min(lt.days * 2, 100)}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-[#2c2c2c] w-12 text-right">{lt.days}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4"><AlertCircle className="h-5 w-5 text-amber-500" /><h3 className="font-semibold text-[#2c2c2c]">Attendance vs Org Average</h3></div>
              <div className="space-y-4">
                <div><div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Your Team</span><span className="font-semibold text-green-600">{data.attendanceRateVsOrg.team}%</span></div><div className="w-full bg-gray-100 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${data.attendanceRateVsOrg.team}%` }} /></div></div>
                <div><div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Org Average</span><span className="font-semibold text-indigo-600">{data.attendanceRateVsOrg.org}%</span></div><div className="w-full bg-gray-100 rounded-full h-2.5"><div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${data.attendanceRateVsOrg.org}%` }} /></div></div>
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500 shrink-0" /><span className="text-sm text-amber-700">{data.unplannedAbsences} unplanned absences this month</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
