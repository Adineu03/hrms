'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plug, Unplug, Clock } from 'lucide-react';

interface ConnectedApp {
  id: string;
  appName: string;
  scopes: string[];
  lastAccessed: string;
  authorizedAt: string;
  logoInitial: string;
}

const MOCK_APPS: ConnectedApp[] = [
  { id: '1', appName: 'HR Analytics Portal', scopes: ['read:employees', 'read:payroll'], lastAccessed: '2026-03-09', authorizedAt: '2026-01-15', logoInitial: 'HA' },
  { id: '2', appName: 'Mobile App (iOS)', scopes: ['read:employees', 'read:leave', 'write:attendance'], lastAccessed: '2026-03-09', authorizedAt: '2025-11-20', logoInitial: 'MB' },
  { id: '3', appName: 'Slack Bot', scopes: ['read:leave'], lastAccessed: '2026-03-08', authorizedAt: '2026-02-01', logoInitial: 'SB' },
];

const SCOPE_COLORS: Record<string, string> = {
  'read:employees': 'bg-indigo-50 text-indigo-700',
  'read:payroll': 'bg-emerald-50 text-emerald-700',
  'read:leave': 'bg-blue-50 text-blue-700',
  'write:attendance': 'bg-orange-50 text-orange-700',
};

export default function ConnectedApps() {
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get('/integrations-api/employee/connected-apps')
      .then((res) => setApps(res.data.data ?? MOCK_APPS))
      .catch(() => setApps(MOCK_APPS))
      .finally(() => setLoading(false));
  }, []);

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await api.post(`/integrations-api/employee/connected-apps/${id}/revoke`);
      setApps((prev) => prev.filter((a) => a.id !== id));
      setSuccess('App access revoked successfully.');
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
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#2c2c2c]">Connected Apps</h2>
        <p className="text-sm text-gray-500 mt-0.5">Apps that can access your HR data</p>
      </div>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {apps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Plug className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No apps connected to your account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                    {app.logoInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#2c2c2c]">{app.appName}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Clock className="h-3 w-3" />
                      Last accessed: {app.lastAccessed} &bull; Authorized: {app.authorizedAt}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {app.scopes.map((scope) => (
                        <span
                          key={scope}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${SCOPE_COLORS[scope] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(app.id)}
                  disabled={revoking === app.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <Unplug className="h-3.5 w-3.5" />
                  {revoking === app.id ? 'Revoking...' : 'Revoke Access'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
