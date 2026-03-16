'use client';
import { useState } from 'react';
import IntegrationMarketplace from './admin/integration-marketplace';
import ApiKeyManagement from './admin/api-key-management';
import WebhookConfiguration from './admin/webhook-configuration';
import OAuthAppRegistry from './admin/oauth-app-registry';
import DataSync from './admin/data-sync';
import ApiUsageAnalytics from './admin/api-usage-analytics';

const TABS = [
  { id: 'marketplace', label: 'Integration Marketplace' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'oauth-apps', label: 'OAuth Apps' },
  { id: 'data-sync', label: 'Data Sync' },
  { id: 'analytics', label: 'API Analytics' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('marketplace');

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Integrations &amp; API Platform</h1>
        <p className="text-gray-500 mt-1">Connect external tools, manage API access, and monitor usage</p>
      </div>

      <div className="overflow-x-auto mb-6">
        <div className="flex gap-1 bg-white border border-border rounded-xl p-1 shadow-sm w-fit min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'marketplace' && <IntegrationMarketplace />}
        {activeTab === 'api-keys' && <ApiKeyManagement />}
        {activeTab === 'webhooks' && <WebhookConfiguration />}
        {activeTab === 'oauth-apps' && <OAuthAppRegistry />}
        {activeTab === 'data-sync' && <DataSync />}
        {activeTab === 'analytics' && <ApiUsageAnalytics />}
      </div>
    </div>
  );
}
