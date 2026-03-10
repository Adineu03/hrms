'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Users, TrendingDown, Briefcase, Clock } from 'lucide-react';

interface KpiData {
  headcount: number;
  attritionRate: number;
  openRoles: number;
  avgTenureMonths: number;
}

export default function HrDashboards() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/people-analytics/admin/hr-dashboards/kpis')
      .then((r) => setKpis(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const metrics = kpis ? [
    { label: 'Total Headcount', value: kpis.headcount.toString(), icon: Users, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Attrition Rate', value: `${kpis.attritionRate}%`, icon: TrendingDown, color: 'text-red-600 bg-red-50' },
    { label: 'Open Roles', value: kpis.openRoles.toString(), icon: Briefcase, color: 'text-amber-600 bg-amber-50' },
    { label: 'Avg Tenure', value: `${kpis.avgTenureMonths} mo`, icon: Clock, color: 'text-green-600 bg-green-50' },
  ] : [];

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading dashboards...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{m.label}</span>
              <span className={`p-2 rounded-lg ${m.color}`}><m.icon className="h-4 w-4" /></span>
            </div>
            <div className="text-2xl font-bold text-[#2c2c2c]">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-[#2c2c2c] mb-4">Pinned Metrics</h3>
        <p className="text-gray-400 text-sm">Use the pin button on any metric to add it to your homepage dashboard. Export to PDF or Excel from the top-right toolbar.</p>
      </div>
    </div>
  );
}
