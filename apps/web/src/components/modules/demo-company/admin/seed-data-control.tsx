'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Play, RefreshCw, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

interface SeedStatus {
  module: string;
  status: 'running' | 'done' | 'failed' | 'idle';
  lastRunAt: string | null;
}

interface SeedLog {
  id: string;
  runAt: string;
  modules: string[];
  dateRange: number;
  status: 'running' | 'done' | 'failed';
  message: string;
}

const MODULES = [
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'performance', label: 'Performance' },
  { id: 'expense', label: 'Expense' },
  { id: 'learning', label: 'Learning' },
  { id: 'core-hr', label: 'Core HR' },
];

const DATE_RANGES = [
  { value: 30, label: '30 Days' },
  { value: 60, label: '60 Days' },
  { value: 90, label: '90 Days' },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  running: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: RefreshCw, label: 'Running' },
  done: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Done' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Failed' },
  idle: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock, label: 'Idle' },
};

export default function SeedDataControl() {
  const [statuses, setStatuses] = useState<SeedStatus[]>([]);
  const [logs, setLogs] = useState<SeedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState(30);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState('');
  const [triggerSuccess, setTriggerSuccess] = useState('');

  const fetchStatus = () => {
    api.get('/demo-company/admin/seed-data-control')
      .then((r) => {
        const raw = r.data.data ?? r.data;
        if (Array.isArray(raw)) {
          setStatuses(raw);
        } else if (raw?.seededModules) {
          setStatuses(
            MODULES.map((m) => ({
              module: m.id,
              status: (raw.seededModules as string[]).includes(m.id) ? 'done' as const : 'idle' as const,
              lastRunAt: raw.lastRunAt || null,
            }))
          );
        } else {
          setStatuses([]);
        }
      })
      .catch(() => setError('Failed to load seed status.'))
      .finally(() => setLoading(false));
  };

  const fetchLogs = () => {
    api.get('/demo-company/admin/seed-data-control/log')
      .then((r) => {
        const raw = r.data.data ?? r.data;
        setLogs(Array.isArray(raw) ? raw : raw?.logs ?? []);
      })
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();
  }, []);

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
    );
  };

  const selectAll = () => setSelectedModules(MODULES.map((m) => m.id));
  const clearAll = () => setSelectedModules([]);

  const handleTrigger = async () => {
    if (selectedModules.length === 0) {
      setTriggerError('Select at least one module to seed.');
      return;
    }
    setTriggering(true);
    setTriggerError('');
    setTriggerSuccess('');
    try {
      await api.post('/demo-company/admin/seed-data-control/trigger', {
        modules: selectedModules,
        dateRange,
      });
      setTriggerSuccess('Seed job triggered successfully. Check logs below for progress.');
      fetchStatus();
      fetchLogs();
    } catch {
      setTriggerError('Failed to trigger seed job. Please try again.');
    } finally {
      setTriggering(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#2c2c2c]">Seed Data Control</h2>
        <p className="text-sm text-gray-500 mt-0.5">Generate realistic demo data for selected modules across a date range</p>
      </div>

      {/* Module Status Overview */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
          Loading seed status...
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4 text-red-600 text-sm">{error}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-[#2c2c2c] mb-4">Module Seed Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {statuses.map((s) => {
              const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.idle;
              const Icon = cfg.icon;
              return (
                <div key={s.module} className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <span className={`p-1.5 rounded-md ${cfg.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.text} ${s.status === 'running' ? 'animate-spin' : ''}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#2c2c2c] truncate">{s.module}</p>
                    <p className={`text-xs ${cfg.text}`}>{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trigger Seed Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-[#2c2c2c] mb-4">Trigger Seed Job</h3>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Modules to Seed</label>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-indigo-600 hover:underline">Select All</button>
              <span className="text-gray-300">|</span>
              <button onClick={clearAll} className="text-xs text-gray-500 hover:underline">Clear</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {MODULES.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedModules.includes(m.id)
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-indigo-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedModules.includes(m.id)}
                  onChange={() => toggleModule(m.id)}
                  className="accent-indigo-600"
                />
                <span className="text-sm text-[#2c2c2c]">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <div className="flex gap-3">
            {DATE_RANGES.map((dr) => (
              <label
                key={dr.value}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  dateRange === dr.value
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-indigo-200'
                }`}
              >
                <input
                  type="radio"
                  name="dateRange"
                  value={dr.value}
                  checked={dateRange === dr.value}
                  onChange={() => setDateRange(dr.value)}
                  className="accent-indigo-600"
                />
                <span className="text-sm font-medium">{dr.label}</span>
              </label>
            ))}
          </div>
        </div>

        {triggerError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{triggerError}</p>
        )}
        {triggerSuccess && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">{triggerSuccess}</p>
        )}

        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Play className="h-4 w-4" />
          {triggering ? 'Triggering...' : 'Trigger Seed'}
        </button>
      </div>

      {/* Seed Logs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-gray-400" />
          <h3 className="font-semibold text-[#2c2c2c]">Seed Logs</h3>
          <button onClick={fetchLogs} className="ml-auto text-xs text-indigo-600 hover:underline">Refresh</button>
        </div>

        {logsLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No seed jobs have been run yet.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.idle;
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <span className={`p-1.5 rounded-md mt-0.5 ${cfg.bg} flex-shrink-0`}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.text}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[#2c2c2c]">
                        {log.modules.join(', ')} — {log.dateRange} days
                      </p>
                      <span className="text-xs text-gray-400">{formatDate(log.runAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{log.message}</p>
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
