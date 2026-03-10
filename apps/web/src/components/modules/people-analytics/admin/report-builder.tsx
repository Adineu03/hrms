'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, FileBarChart, Calendar } from 'lucide-react';
import type { AnalyticsReportData } from '@hrms/shared';

const CHART_TYPES = ['table', 'bar', 'line', 'pie'];
const SOURCE_MODULES = ['core-hr', 'attendance', 'leave-management', 'performance-growth', 'payroll-processing'];

export default function ReportBuilder() {
  const [reports, setReports] = useState<AnalyticsReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', reportType: 'table', sourceModules: [] as string[], isShared: false });

  const load = () => {
    api.get('/people-analytics/admin/report-builder')
      .then((r) => setReports(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name) return;
    await api.post('/people-analytics/admin/report-builder', {
      name: form.name,
      reportType: form.reportType,
      sourceModules: form.sourceModules,
      selectedFields: {},
      isShared: form.isShared,
      createdBy: '',
    });
    setForm({ name: '', reportType: 'table', sourceModules: [], isShared: false });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/people-analytics/admin/report-builder/${id}`);
    load();
  };

  const toggleModule = (m: string) => {
    setForm((f) => ({
      ...f,
      sourceModules: f.sourceModules.includes(m) ? f.sourceModules.filter((x) => x !== m) : [...f.sourceModules, m],
    }));
  };

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading reports...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#2c2c2c]">Report Library</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" /> New Report
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Report Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="e.g. Monthly Headcount Report" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Chart Type</label>
              <select value={form.reportType} onChange={(e) => setForm({ ...form, reportType: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                {CHART_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Source Modules</label>
            <div className="flex flex-wrap gap-2">
              {SOURCE_MODULES.map((m) => (
                <button key={m} onClick={() => toggleModule(m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.sourceModules.includes(m) ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isShared" checked={form.isShared} onChange={(e) => setForm({ ...form, isShared: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="isShared" className="text-sm text-gray-600">Share with managers</label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">Create Report</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><FileBarChart className="h-10 w-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No reports yet. Build your first report above.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 relative">
              <button onClick={() => handleDelete(r.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
              <div className="flex items-center gap-2 mb-2">
                <FileBarChart className="h-4 w-4 text-indigo-400" />
                <div className="font-semibold text-[#2c2c2c] text-sm">{r.name}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">{r.reportType}</span>
                {r.isShared && <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded">Shared</span>}
                {r.schedule && <Calendar className="h-3 w-3" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
