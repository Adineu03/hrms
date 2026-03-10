'use client';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, X, Users } from 'lucide-react';
import { api } from '@/lib/api';

interface TeamHeadcountPlan {
  id: string;
  planName: string;
  planYear: number;
  currentHeadcount: number;
  approvedHeadcount: number;
  targetHeadcount: number;
  openRequisitions: number;
  status: string;
}

interface OpenPosition {
  id: string;
  positionTitle: string;
  departmentId: string;
  openSlots: number;
}

interface HeadcountSummary {
  approvedHeadcount: number;
  actualHeadcount: number;
  openPositions: number;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  active: 'bg-indigo-100 text-indigo-700',
};

export default function TeamHeadcountViewTab() {
  const [plans, setPlans] = useState<TeamHeadcountPlan[]>([]);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const [summary, setSummary] = useState<HeadcountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, positionsRes] = await Promise.allSettled([
        api.get('/workforce-planning/manager/team-headcount'),
        api.get('/workforce-planning/manager/team-headcount/open-positions'),
      ]);

      if (plansRes.status === 'fulfilled') {
        const planData = plansRes.value.data?.data || plansRes.value.data || [];
        const arr = Array.isArray(planData) ? planData : [];
        setPlans(arr);
        if (arr.length > 0) {
          setSummary({
            approvedHeadcount: arr.reduce((sum: number, p: TeamHeadcountPlan) => sum + (p.approvedHeadcount || 0), 0),
            actualHeadcount: arr.reduce((sum: number, p: TeamHeadcountPlan) => sum + (p.currentHeadcount || 0), 0),
            openPositions: arr.reduce((sum: number, p: TeamHeadcountPlan) => sum + (p.openRequisitions || 0), 0),
          });
        }
      }
      if (positionsRes.status === 'fulfilled') {
        setOpenPositions(positionsRes.value.data?.data || positionsRes.value.data || []);
      }
    } catch {
      setError('Failed to load team headcount data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading team headcount...</span>
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

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Approved HC</p>
            <p className="text-2xl font-bold text-indigo-600">{summary.approvedHeadcount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Actual HC</p>
            <p className="text-2xl font-bold text-green-600">{summary.actualHeadcount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Open Positions</p>
            <p className="text-2xl font-bold text-orange-600">{summary.openPositions}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-4">Team Headcount Plans</h2>
        {plans.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No headcount plans found for your team.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan Name</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current HC</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Approved HC</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Target HC</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Open Req</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-medium text-[#2c2c2c]">{plan.planName}</td>
                    <td className="py-3 px-2 text-gray-600">{plan.planYear}</td>
                    <td className="py-3 px-2 text-gray-700">{plan.currentHeadcount}</td>
                    <td className="py-3 px-2 text-gray-700">{plan.approvedHeadcount}</td>
                    <td className="py-3 px-2 text-gray-700">{plan.targetHeadcount}</td>
                    <td className="py-3 px-2 text-gray-700">{plan.openRequisitions ?? 0}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[plan.status] || 'bg-gray-100 text-gray-700'}`}>
                        {plan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openPositions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#2c2c2c] mb-4">Open Positions</h2>
          <div className="space-y-2">
            {openPositions.map((pos) => (
              <div key={pos.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <span className="text-sm font-medium text-[#2c2c2c]">{pos.positionTitle}</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  {pos.openSlots} open slot{pos.openSlots !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
