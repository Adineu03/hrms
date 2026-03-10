'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Target } from 'lucide-react';
import type { AnalyticsKpiData } from '@hrms/shared';

export default function CustomMetrics() {
  const [kpis, setKpis] = useState<AnalyticsKpiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', formula: '', unit: '', targetValue: '' });

  const load = () => {
    api.get('/people-analytics/admin/custom-metrics')
      .then((r) => setKpis(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.formula) return;
    await api.post('/people-analytics/admin/custom-metrics', {
      name: form.name,
      formula: form.formula,
      unit: form.unit || null,
      targetValue: form.targetValue ? Number(form.targetValue) : null,
    });
    setForm({ name: '', formula: '', unit: '', targetValue: '' });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/people-analytics/admin/custom-metrics/${id}`);
    load();
  };

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading KPIs...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#2c2c2c]">Custom KPIs &amp; Metrics</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" /> New KPI
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">KPI Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="e.g. Revenue per Employee" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Formula *</label>
              <input value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="e.g. revenue / headcount" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="currency / percentage / number" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Target Value</label>
              <input type="number" value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="e.g. 500000" /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">Save KPI</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {kpis.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Target className="h-10 w-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No custom KPIs defined yet.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 relative">
              <button onClick={() => handleDelete(kpi.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
              <div className="font-semibold text-[#2c2c2c] mb-1">{kpi.name}</div>
              <div className="text-xs text-gray-400 mb-3 font-mono">{kpi.formula}</div>
              {kpi.targetValue && <div className="text-sm text-indigo-600 font-medium">Target: {kpi.targetValue} {kpi.unit}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
