'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Play, Clock, BarChart2, TrendingUp, Download, Users } from 'lucide-react';

interface SummaryData {
  demosStartedThisMonth: number;
  avgSessionLengthMinutes: number;
  topModules: { name: string; views: number }[];
}

interface FunnelStep {
  label: string;
  count: number;
  percentage: number;
}

export default function DemoAnalytics() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [funnelLoading, setFunnelLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [funnelError, setFunnelError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/demo-company/admin/demo-analytics/summary')
      .then((r) => setSummary(r.data.data))
      .catch(() => setSummaryError('Failed to load summary.'))
      .finally(() => setSummaryLoading(false));

    api.get('/demo-company/admin/demo-analytics/funnel')
      .then((r) => {
        const raw = r.data.data ?? r.data;
        const arr = Array.isArray(raw) ? raw : raw?.funnel ?? [];
        setFunnel(arr.map((item: any) => ({
          label: item.label || item.stage || '',
          count: item.count ?? 0,
          percentage: item.percentage ?? 0,
        })));
      })
      .catch(() => setFunnelError('Failed to load funnel data.'))
      .finally(() => setFunnelLoading(false));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/demo-company/admin/demo-analytics/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `demo-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // silently ignore
    } finally {
      setExporting(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || isNaN(minutes)) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Demo Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">Track demo engagement, session metrics, and conversion performance</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
          Loading summary...
        </div>
      ) : summaryError ? (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4 text-red-600 text-sm">{summaryError}</div>
      ) : summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Demos This Month</span>
                <span className="p-2 rounded-lg text-indigo-600 bg-indigo-50">
                  <Play className="h-4 w-4" />
                </span>
              </div>
              <div className="text-3xl font-bold text-[#2c2c2c]">{summary.demosStartedThisMonth}</div>
              <p className="text-xs text-gray-400 mt-1">Demo sessions started</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Avg Session Length</span>
                <span className="p-2 rounded-lg text-amber-600 bg-amber-50">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <div className="text-3xl font-bold text-[#2c2c2c]">{formatDuration(summary.avgSessionLengthMinutes)}</div>
              <p className="text-xs text-gray-400 mt-1">Average per session</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Top Modules</span>
                <span className="p-2 rounded-lg text-green-600 bg-green-50">
                  <BarChart2 className="h-4 w-4" />
                </span>
              </div>
              <div className="space-y-1.5">
                {summary.topModules.slice(0, 3).map((m, idx) => (
                  <div key={m.name} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-4">#{idx + 1}</span>
                    <span className="text-sm text-[#2c2c2c] flex-1 truncate">{m.name}</span>
                    <span className="text-xs text-gray-400">{m.views}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="h-4 w-4 text-indigo-600" />
          <h3 className="font-semibold text-[#2c2c2c]">Conversion Funnel</h3>
        </div>

        {funnelLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">Loading funnel data...</p>
        ) : funnelError ? (
          <p className="text-sm text-red-600">{funnelError}</p>
        ) : funnel.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No funnel data available yet.</p>
        ) : (
          <div className="space-y-4">
            {funnel.map((step, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-[#2c2c2c]">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      <Users className="h-3.5 w-3.5 inline mr-1" />
                      {step.count.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-indigo-600 w-12 text-right">{step.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${step.percentage}%` }}
                  />
                </div>
                {idx < funnel.length - 1 && (
                  <p className="text-xs text-gray-400 mt-1 ml-8">
                    Drop-off: {(funnel[idx].percentage - funnel[idx + 1].percentage).toFixed(1)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Info Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
        <Download className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-700">
          Export includes session-level data: demo start times, module views, persona used, session duration, and signup conversion status.
        </p>
      </div>
    </div>
  );
}
