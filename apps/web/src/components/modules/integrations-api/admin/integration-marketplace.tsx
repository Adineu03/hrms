'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Search, RefreshCw, ExternalLink } from 'lucide-react';

interface Connector {
  id: string;
  name: string;
  category: string;
  health: 'healthy' | 'degraded' | 'error' | 'unknown';
  enabled: boolean;
  description: string;
  logoInitial: string;
}

const MOCK_CONNECTORS: Connector[] = [
  { id: '1', name: 'Slack', category: 'Communication', health: 'healthy', enabled: true, description: 'Team messaging and notifications', logoInitial: 'SL' },
  { id: '2', name: 'QuickBooks', category: 'Payroll', health: 'healthy', enabled: true, description: 'Accounting and payroll sync', logoInitial: 'QB' },
  { id: '3', name: 'SAP', category: 'ERP', health: 'degraded', enabled: true, description: 'Enterprise resource planning integration', logoInitial: 'SA' },
  { id: '4', name: 'Google Workspace', category: 'HRMS', health: 'healthy', enabled: true, description: 'Directory and calendar sync', logoInitial: 'GW' },
  { id: '5', name: 'Zoom', category: 'Communication', health: 'unknown', enabled: false, description: 'Video conferencing integration', logoInitial: 'ZM' },
  { id: '6', name: 'Jira', category: 'HRMS', health: 'error', enabled: false, description: 'Project tracking and work logging', logoInitial: 'JR' },
];

const CATEGORIES = ['All', 'HRMS', 'Payroll', 'ERP', 'Communication'];

const HEALTH_CONFIG: Record<string, { color: string; label: string }> = {
  healthy: { color: 'bg-green-500', label: 'Healthy' },
  degraded: { color: 'bg-yellow-500', label: 'Degraded' },
  error: { color: 'bg-red-500', label: 'Error' },
  unknown: { color: 'bg-gray-400', label: 'Unknown' },
};

const CATEGORY_COLORS: Record<string, string> = {
  Communication: 'bg-blue-100 text-blue-700',
  Payroll: 'bg-emerald-100 text-emerald-700',
  ERP: 'bg-purple-100 text-purple-700',
  HRMS: 'bg-indigo-100 text-indigo-700',
};

export default function IntegrationMarketplace() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get('/integrations-api/admin/integration-marketplace')
      .then((res) => setConnectors(res.data.data ?? MOCK_CONNECTORS))
      .catch(() => setConnectors(MOCK_CONNECTORS))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (connector: Connector) => {
    setToggling(connector.id);
    try {
      await api.post(`/integrations-api/admin/integration-marketplace/${connector.id}/toggle`, {
        enabled: !connector.enabled,
      });
      setConnectors((prev) =>
        prev.map((c) => (c.id === connector.id ? { ...c, enabled: !c.enabled } : c))
      );
    } catch {
      // silently fail
    } finally {
      setToggling(null);
    }
  };

  const filtered = connectors.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || c.category === category;
    return matchesSearch && matchesCategory;
  });

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
        <h2 className="text-lg font-semibold text-[#2c2c2c]">Integration Marketplace</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search connectors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((connector) => {
          const health = HEALTH_CONFIG[connector.health] ?? HEALTH_CONFIG.unknown;
          const catColor = CATEGORY_COLORS[connector.category] ?? 'bg-gray-100 text-gray-700';
          return (
            <div
              key={connector.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-sm">
                    {connector.logoInitial}
                  </div>
                  <div>
                    <div className="font-semibold text-[#2c2c2c] text-sm">{connector.name}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor}`}>
                      {connector.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${health.color}`}></span>
                  <span className="text-xs text-gray-500">{health.label}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500">{connector.description}</p>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleToggle(connector)}
                  disabled={toggling === connector.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    connector.enabled
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  } disabled:opacity-50`}
                >
                  {toggling === connector.id ? (
                    <RefreshCw className="h-3 w-3 animate-spin inline" />
                  ) : connector.enabled ? (
                    'Disable'
                  ) : (
                    'Enable'
                  )}
                </button>
                <button className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                  <ExternalLink className="h-3 w-3" />
                  View Logs
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-gray-500 text-sm">No connectors match your search.</p>
        </div>
      )}
    </div>
  );
}
