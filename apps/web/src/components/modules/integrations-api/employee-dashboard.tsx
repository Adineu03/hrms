'use client';
import { useState } from 'react';
import ConnectedApps from './employee/connected-apps';
import MyDataExport from './employee/my-data-export';
import AiInsights from './employee/ai-insights';

const TABS = [
  { id: 'connected-apps', label: 'Connected Apps' },
  { id: 'data-export', label: 'My Data Export' },
  { id: 'ai-insights', label: 'AI Insights' },
];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('connected-apps');

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Integrations &amp; API Platform</h1>
        <p className="text-gray-500 mt-1">Manage connected apps and export your personal data</p>
      </div>

      <div className="overflow-x-auto mb-6">
        <div className="flex gap-1 bg-white border border-border rounded-xl p-1 shadow-sm w-fit min-w-max">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
        {activeTab === 'connected-apps' && <ConnectedApps />}
        {activeTab === 'data-export' && <MyDataExport />}
        {activeTab === 'ai-insights' && <AiInsights />}
      </div>
    </div>
  );
}
