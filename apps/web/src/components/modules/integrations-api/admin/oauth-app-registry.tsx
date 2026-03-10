'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';

interface OAuthApp {
  id: string;
  appName: string;
  clientId: string;
  scopes: string[];
  authorizedUsers: number;
  status: 'active' | 'revoked';
  lastUsed: string;
  ownerEmail: string;
}

const MOCK_APPS: OAuthApp[] = [
  { id: '1', appName: 'HR Analytics Portal', clientId: 'client_abc123', scopes: ['read:employees', 'read:payroll'], authorizedUsers: 24, status: 'active', lastUsed: '2026-03-09', ownerEmail: 'dev@company.com' },
  { id: '2', appName: 'Mobile App (iOS)', clientId: 'client_def456', scopes: ['read:employees', 'read:leave', 'write:attendance'], authorizedUsers: 156, status: 'active', lastUsed: '2026-03-09', ownerEmail: 'mobile@company.com' },
  { id: '3', appName: 'Slack Bot Integration', clientId: 'client_ghi789', scopes: ['read:leave'], authorizedUsers: 89, status: 'active', lastUsed: '2026-03-08', ownerEmail: 'ops@company.com' },
  { id: '4', appName: 'Legacy Dashboard v1', clientId: 'client_jkl012', scopes: ['read:employees'], authorizedUsers: 0, status: 'revoked', lastUsed: '2025-09-15', ownerEmail: 'admin@company.com' },
];

const SCOPE_OPTIONS = ['read:employees', 'write:attendance', 'read:payroll', 'read:leave'];

export default function OAuthAppRegistry() {
  const [apps, setApps] = useState<OAuthApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  const [form, setForm] = useState({
    appName: '',
    redirectUris: '',
    scopes: [] as string[],
    ownerEmail: '',
    description: '',
  });

  useEffect(() => {
    setLoading(true);
    api
      .get('/integrations-api/admin/oauth-app-registry')
      .then((res) => setApps(res.data.data ?? MOCK_APPS))
      .catch(() => setApps(MOCK_APPS))
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
    if (!form.appName.trim()) { setError('App name is required.'); return; }
    if (!form.ownerEmail.trim()) { setError('Owner email is required.'); return; }
    if (form.scopes.length === 0) { setError('Select at least one scope.'); return; }
    try {
      await api.post('/integrations-api/admin/oauth-app-registry', {
        appName: form.appName,
        redirectUris: form.redirectUris.split('\n').map((u) => u.trim()).filter(Boolean),
        scopes: form.scopes,
        ownerEmail: form.ownerEmail,
        description: form.description,
      });
      setSuccess('OAuth app registered successfully.');
      setShowForm(false);
      setForm({ appName: '', redirectUris: '', scopes: [], ownerEmail: '', description: '' });
    } catch {
      setError('Failed to register OAuth app. Please try again.');
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await api.post(`/integrations-api/admin/oauth-app-registry/${id}/revoke`);
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'revoked' } : a)));
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
        <h2 className="text-lg font-semibold text-[#2c2c2c]">OAuth App Registry</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Register App
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
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Register New OAuth App
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App Name *</label>
                <input
                  type="text"
                  value={form.appName}
                  onChange={(e) => setForm((p) => ({ ...p, appName: e.target.value }))}
                  placeholder="e.g. HR Analytics Portal"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email *</label>
                <input
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => setForm((p) => ({ ...p, ownerEmail: e.target.value }))}
                  placeholder="dev@company.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Redirect URIs (one per line)</label>
              <textarea
                value={form.redirectUris}
                onChange={(e) => setForm((p) => ({ ...p, redirectUris: e.target.value }))}
                placeholder="https://yourapp.com/callback"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe the purpose of this OAuth app..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Register App
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">App Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Client ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Scopes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Authorized Users</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Used</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {apps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#2c2c2c]">{app.appName}</div>
                    <div className="text-xs text-gray-400">{app.ownerEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-700">
                      {app.clientId}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {app.scopes.map((s) => (
                        <span key={s} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{app.authorizedUsers}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        app.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{app.lastUsed}</td>
                  <td className="px-4 py-3">
                    {app.status === 'active' && (
                      <button
                        onClick={() => handleRevoke(app.id)}
                        disabled={revoking === app.id}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {revoking === app.id ? 'Revoking...' : 'Revoke'}
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
