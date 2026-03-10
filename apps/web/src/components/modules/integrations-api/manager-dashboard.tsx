'use client';
import { useState } from 'react';
import TeamIntegrationStatus from './manager/team-integration-status';
import DataExportTeam from './manager/data-export-team';

const TABS = [
  { id: 'integration-status', label: 'Integration Status' },
  { id: 'data-export', label: 'Team Data Export' },
];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('integration-status');

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Integrations &amp; API Platform</h1>
        <p className="text-gray-500 mt-1">Monitor integration health and export team data</p>
      </div>

      <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
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

      <div>
        {activeTab === 'integration-status' && <TeamIntegrationStatus />}
        {activeTab === 'data-export' && <DataExportTeam />}
      </div>
    </div>
  );
}
