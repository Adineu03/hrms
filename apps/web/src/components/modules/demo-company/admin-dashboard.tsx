'use client';
import { useState } from 'react';
import DemoOrgManagement from './admin/demo-org-management';
import SeedDataControl from './admin/seed-data-control';
import DemoPersonas from './admin/demo-personas';
import GuidedTourBuilder from './admin/guided-tour-builder';
import DemoAnalytics from './admin/demo-analytics';
import AiInsights from './admin/ai-insights';

const TABS = [
  { id: 'demo-org', label: 'Demo Org' },
  { id: 'seed-data', label: 'Seed Data' },
  { id: 'personas', label: 'Personas' },
  { id: 'tour-builder', label: 'Tour Builder' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'ai-insights', label: 'AI Insights' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('demo-org');

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Demo Company</h1>
        <p className="text-gray-500 mt-1">Manage sandbox environments, seed data, demo personas, and guided tours for prospects</p>
      </div>

      <div className="overflow-x-auto mb-6">
        <div className="flex gap-1 bg-white border border-border rounded-xl p-1 shadow-sm w-fit min-w-max">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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
        {activeTab === 'demo-org' && <DemoOrgManagement />}
        {activeTab === 'seed-data' && <SeedDataControl />}
        {activeTab === 'personas' && <DemoPersonas />}
        {activeTab === 'tour-builder' && <GuidedTourBuilder />}
        {activeTab === 'analytics' && <DemoAnalytics />}
        {activeTab === 'ai-insights' && <AiInsights />}
      </div>
    </div>
  );
}
