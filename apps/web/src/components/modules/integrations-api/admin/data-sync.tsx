'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Play, Edit2, Trash2, RefreshCw } from 'lucide-react';

interface SyncConfig {
  id: string;
  syncName: string;
  source: string;
  target: string;
  frequency: string;
  status: 'enabled' | 'disabled';
  lastSync: string;
  nextSync: string;
}

const MOCK_SYNCS: SyncConfig[] = [
  { id: '1', syncName: 'Employee CSV Import', source: 'csv', target: 'employees', frequency: 'daily', status: 'enabled', lastSync: '2026-03-09 06:00', nextSync: '2026-03-10 06:00' },
  { id: '2', syncName: 'Attendance API Sync', source: 'api', target: 'attendance', frequency: 'hourly', status: 'enabled', lastSync: '2026-03-09 14:00', nextSync: '2026-03-09 15:00' },
  { id: '3', syncName: 'Payroll QuickBooks Sync', source: 'connector', target: 'payroll', frequency: 'weekly', status: 'disabled', lastSync: '2026-03-02 08:00', nextSync: '2026-03-09 08:00' },
  { id: '4', syncName: 'Org Chart Excel Import', source: 'excel', target: 'employees', frequency: 'manual', status: 'disabled', lastSync: '2026-02-15 12:00', nextSync: 'N/A' },
];

const SOURCE_TYPES = ['connector', 'csv', 'excel', 'api'];
const TARGET_TYPES = ['employees', 'attendance', 'payroll'];
const FREQUENCIES = ['realtime', 'hourly', 'daily', 'weekly', 'manual'];

export default function DataSync() {
  const [syncs, setSyncs] = useState<SyncConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [triggering, setTriggering] = useState<string | null>(null);

  const [form, setForm] = useState({
    syncName: '',
    sourceType: 'connector',
    targetType: 'employees',
    frequency: 'daily',
  });

  useEffect(() => {
    setLoading(true);
    api
      .get('/integrations-api/admin/data-sync')
      .then((res) => setSyncs(res.data.data ?? MOCK_SYNCS))
      .catch(() => setSyncs(MOCK_SYNCS))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.syncName.trim()) { setError('Sync name is required.'); return; }
    try {
      await api.post('/integrations-api/admin/data-sync', form);
      setSuccess('Data sync configuration created successfully.');
      setShowForm(false);
      setForm({ syncName: '', sourceType: 'connector', targetType: 'employees', frequency: 'daily' });
    } catch {
      setError('Failed to create sync configuration. Please try again.');
    }
  };

  const handleTrigger = async (id: string) => {
    setTriggering(id);
    try {
      await api.post(`/integrations-api/admin/data-sync/${id}/trigger`);
      setSuccess(`Sync triggered successfully.`);
    } catch {
      setError('Failed to trigger sync.');
    } finally {
      setTriggering(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/integrations-api/admin/data-sync/${id}`);
      setSyncs((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#2c2c2c]">Data Sync &amp; Import/Export</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Sync
        </button>
      </div>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="font-medium text-[#2c2c2c] mb-4">Add New Sync Configuration</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sync Name *</label>
              <input
                type="text"
                value={form.syncName}
                onChange={(e) => setForm((p) => ({ ...p, syncName: e.target.value }))}
                placeholder="e.g. Employee CSV Import"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                <select
                  value={form.sourceType}
                  onChange={(e) => setForm((p) => ({ ...p, sourceType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Type</label>
                <select
                  value={form.targetType}
                  onChange={(e) => setForm((p) => ({ ...p, targetType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {TARGET_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Create Sync
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sync Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Target</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Frequency</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Sync</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Next Sync</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {syncs.map((sync) => (
                <tr key={sync.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#2c2c2c]">{sync.syncName}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {sync.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {sync.target}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{sync.frequency}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        sync.status === 'enabled'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {sync.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{sync.lastSync}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{sync.nextSync}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTrigger(sync.id)}
                        disabled={triggering === sync.id}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        title="Trigger Now"
                      >
                        {triggering === sync.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        {triggering === sync.id ? 'Running...' : 'Trigger'}
                      </button>
                      <button className="text-gray-400 hover:text-gray-600" title="Edit">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(sync.id)}
                        className="text-red-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
