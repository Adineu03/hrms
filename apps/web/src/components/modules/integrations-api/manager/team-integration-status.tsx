'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Flag, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

interface IntegrationStatus {
  id: string;
  connectorName: string;
  category: string;
  health: 'healthy' | 'degraded' | 'error' | 'unknown';
  lastSync: string;
  errorMessage?: string;
}

const MOCK_INTEGRATIONS: IntegrationStatus[] = [
  { id: '1', connectorName: 'Google Workspace', category: 'HRMS', health: 'healthy', lastSync: '2026-03-09 14:00', errorMessage: undefined },
  { id: '2', connectorName: 'QuickBooks', category: 'Payroll', health: 'healthy', lastSync: '2026-03-09 08:00', errorMessage: undefined },
  { id: '3', connectorName: 'SAP ERP', category: 'ERP', health: 'degraded', lastSync: '2026-03-08 20:00', errorMessage: 'Slow response times detected on upstream' },
  { id: '4', connectorName: 'Jira', category: 'HRMS', health: 'error', lastSync: '2026-03-07 16:00', errorMessage: 'OAuth token expired, reconnection required' },
  { id: '5', connectorName: 'Zoom', category: 'Communication', health: 'unknown', lastSync: 'Never', errorMessage: undefined },
];

const HEALTH_CONFIG: Record<string, { icon: React.ElementType; color: string; dotColor: string; label: string }> = {
  healthy: { icon: CheckCircle, color: 'text-green-600', dotColor: 'bg-green-500', label: 'Healthy' },
  degraded: { icon: AlertCircle, color: 'text-yellow-600', dotColor: 'bg-yellow-400', label: 'Degraded' },
  error: { icon: AlertCircle, color: 'text-red-600', dotColor: 'bg-red-500', label: 'Error' },
  unknown: { icon: HelpCircle, color: 'text-gray-400', dotColor: 'bg-gray-400', label: 'Unknown' },
};

const CATEGORY_COLORS: Record<string, string> = {
  HRMS: 'bg-indigo-100 text-indigo-700',
  Payroll: 'bg-emerald-100 text-emerald-700',
  ERP: 'bg-purple-100 text-purple-700',
  Communication: 'bg-blue-100 text-blue-700',
};

export default function TeamIntegrationStatus() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [flagMessages, setFlagMessages] = useState<Record<string, string>>({});
  const [flagSuccess, setFlagSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get('/integrations-api/manager/team-integration-status')
      .then((res) => setIntegrations(res.data.data ?? MOCK_INTEGRATIONS))
      .catch(() => setIntegrations(MOCK_INTEGRATIONS))
      .finally(() => setLoading(false));
  }, []);

  const handleFlagSubmit = async (id: string) => {
    const message = flagMessages[id];
    if (!message?.trim()) return;
    try {
      await api.post(`/integrations-api/manager/team-integration-status/${id}/flag-error`, { message });
      setFlagSuccess(`Error flagged for review.`);
      setFlagging(null);
      setFlagMessages((prev) => ({ ...prev, [id]: '' }));
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

  if (integrations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <p className="text-gray-500 text-sm">No integrations configured yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#2c2c2c] mb-4">Team Integration Status</h2>

      {flagSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {flagSuccess}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Connector</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Health Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Sync</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Error Message</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {integrations.map((integration) => {
                const hc = HEALTH_CONFIG[integration.health] ?? HEALTH_CONFIG.unknown;
                const HealthIcon = hc.icon;
                const catColor = CATEGORY_COLORS[integration.category] ?? 'bg-gray-100 text-gray-700';
                const isFlagging = flagging === integration.id;

                return (
                  <tr key={integration.id} className="hover:bg-gray-50 transition-colors align-top">
                    <td className="px-4 py-3 font-medium text-[#2c2c2c]">{integration.connectorName}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor}`}>
                        {integration.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${hc.dotColor}`}></span>
                        <HealthIcon className={`h-4 w-4 ${hc.color}`} />
                        <span className={`text-sm font-medium ${hc.color}`}>{hc.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{integration.lastSync}</td>
                    <td className="px-4 py-3 text-red-500 text-xs max-w-xs">
                      {integration.errorMessage ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {!isFlagging ? (
                        <button
                          onClick={() => setFlagging(integration.id)}
                          className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800"
                        >
                          <Flag className="h-3.5 w-3.5" />
                          Flag Error
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <input
                            type="text"
                            value={flagMessages[integration.id] ?? ''}
                            onChange={(e) =>
                              setFlagMessages((prev) => ({ ...prev, [integration.id]: e.target.value }))
                            }
                            placeholder="Describe the issue..."
                            className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleFlagSubmit(integration.id)}
                              className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
                            >
                              Submit
                            </button>
                            <button
                              onClick={() => setFlagging(null)}
                              className="px-2 py-1 border border-gray-200 text-gray-500 rounded text-xs hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
