'use client';
import { useState, useEffect } from 'react';
import { Loader2, Building2, AlertCircle, X } from 'lucide-react';
import { api } from '@/lib/api';

interface OrgSummary {
  totalHeadcount: number;
  openPositions: number;
  avgSpanOfControl: number;
  managementLayers: number;
}

interface DeptHeadcount {
  departmentId: string;
  departmentName?: string;
  currentHeadcount: number;
  approvedHeadcount: number;
  openRequisitions: number;
}

interface Scenario {
  id: string;
  scenarioName: string;
  description?: string;
  status: string;
}

export default function OrgDesignStudioTab() {
  const [summary, setSummary] = useState<OrgSummary | null>(null);
  const [deptData, setDeptData] = useState<DeptHeadcount[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, deptRes, scenariosRes] = await Promise.allSettled([
        api.get('/workforce-planning/admin/org-design-studio/summary'),
        api.get('/workforce-planning/admin/org-design-studio/headcount-by-dept'),
        api.get('/workforce-planning/admin/org-design-studio/scenarios'),
      ]);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data?.data || summaryRes.value.data || null);
      if (deptRes.status === 'fulfilled') setDeptData(deptRes.value.data?.data || deptRes.value.data || []);
      if (scenariosRes.status === 'fulfilled') setScenarios(scenariosRes.value.data?.data || scenariosRes.value.data || []);
    } catch {
      setError('Failed to load org design data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading org design data...</span>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Headcount', value: summary?.totalHeadcount ?? '—', color: 'text-indigo-600' },
    { label: 'Open Positions', value: summary?.openPositions ?? '—', color: 'text-orange-600' },
    { label: 'Avg Span of Control', value: summary?.avgSpanOfControl != null ? summary.avgSpanOfControl.toFixed(1) : '—', color: 'text-blue-600' },
    { label: 'Management Layers', value: summary?.managementLayers ?? '—', color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-4">Headcount by Department</h2>
        {deptData.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No department data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current HC</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Approved HC</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Open Req</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deptData.map((dept) => (
                  <tr key={dept.departmentId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2">
                      <div className="font-medium text-[#2c2c2c]">{dept.departmentName || '—'}</div>
                      <div className="text-xs text-gray-400 font-mono">{dept.departmentId}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{dept.currentHeadcount}</td>
                    <td className="py-3 px-2 text-gray-700">{dept.approvedHeadcount}</td>
                    <td className="py-3 px-2 text-gray-700">{dept.openRequisitions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-4">Planning Scenarios</h2>
        {scenarios.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No planning scenarios available.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-[#2c2c2c]">{scenario.scenarioName}</p>
                  {scenario.description && <p className="text-xs text-gray-500 mt-0.5">{scenario.description}</p>}
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  {scenario.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
