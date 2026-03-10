'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Eye, EyeOff, KeyRound } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  lastUsed: string;
  expires: string;
  status: 'active' | 'revoked';
}

const MOCK_KEYS: ApiKey[] = [
  { id: '1', name: 'Production Integration', keyPrefix: 'sk_live_ab', scopes: ['read:employees', 'read:leave'], rateLimit: 1000, lastUsed: '2026-03-09', expires: '2027-01-01', status: 'active' },
  { id: '2', name: 'Payroll Sync Bot', keyPrefix: 'sk_live_cd', scopes: ['read:payroll', 'write:attendance'], rateLimit: 500, lastUsed: '2026-03-08', expires: '2026-12-31', status: 'active' },
  { id: '3', name: 'Reporting Dashboard', keyPrefix: 'sk_live_ef', scopes: ['read:employees', 'read:payroll'], rateLimit: 200, lastUsed: '2026-02-28', expires: '2026-06-30', status: 'active' },
  { id: '4', name: 'Legacy API Client', keyPrefix: 'sk_live_gh', scopes: ['read:employees'], rateLimit: 100, lastUsed: '2025-12-01', expires: '2026-01-01', status: 'revoked' },
];

const SCOPE_OPTIONS = ['read:employees', 'write:attendance', 'read:payroll', 'read:leave'];

export default function ApiKeyManagement() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);
  const [visibleKey, setVisibleKey] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    scopes: [] as string[],
    rateLimit: '1000',
    ipWhitelist: '',
    expiryDate: '',
  });

  useEffect(() => {
    setLoading(true);
    api
      .get('/integrations-api/admin/api-key-management')
      .then((res) => setKeys(res.data.data ?? MOCK_KEYS))
      .catch(() => setKeys(MOCK_KEYS))
      .finally(() => setLoading(false));
  }, []);

  const handleScopeToggle = (scope: string) => {
    setForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (form.scopes.length === 0) { setError('Select at least one scope.'); return; }
    try {
      await api.post('/integrations-api/admin/api-key-management', {
        name: form.name,
        scopes: form.scopes,
        rateLimit: parseInt(form.rateLimit),
        ipWhitelist: form.ipWhitelist,
        expiryDate: form.expiryDate,
      });
      setSuccess('API key generated successfully.');
      setShowForm(false);
      setForm({ name: '', scopes: [], rateLimit: '1000', ipWhitelist: '', expiryDate: '' });
    } catch {
      setError('Failed to generate API key. Please try again.');
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await api.post(`/integrations-api/admin/api-key-management/${id}/revoke`);
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k)));
    } catch {
      // silently fail
    } finally {
      setRevoking(null);
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
        <h2 className="text-lg font-semibold text-[#2c2c2c]">API Key Management</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Generate New Key
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
          <h3 className="font-medium text-[#2c2c2c] mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-indigo-600" />
            Generate New API Key
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Production Integration"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (per min)</label>
                <input
                  type="number"
                  value={form.rateLimit}
                  onChange={(e) => setForm((p) => ({ ...p, rateLimit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scopes *</label>
              <div className="flex flex-wrap gap-3">
                {SCOPE_OPTIONS.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.scopes.includes(scope)}
                      onChange={() => handleScopeToggle(scope)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{scope}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP Whitelist</label>
                <input
                  type="text"
                  value={form.ipWhitelist}
                  onChange={(e) => setForm((p) => ({ ...p, ipWhitelist: e.target.value }))}
                  placeholder="e.g. 192.168.1.1, 10.0.0.0/24"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Generate Key
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Key Prefix</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Scopes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rate Limit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Used</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#2c2c2c]">{key.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-700">
                        {visibleKey === key.id ? `${key.keyPrefix}xxxxxxxx` : `${key.keyPrefix}...`}
                      </code>
                      <button
                        onClick={() => setVisibleKey(visibleKey === key.id ? null : key.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {visibleKey === key.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((s) => (
                        <span key={s} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{key.rateLimit}/min</td>
                  <td className="px-4 py-3 text-gray-500">{key.lastUsed}</td>
                  <td className="px-4 py-3 text-gray-500">{key.expires}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        key.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {key.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {key.status === 'active' && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        disabled={revoking === key.id}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {revoking === key.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}
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
