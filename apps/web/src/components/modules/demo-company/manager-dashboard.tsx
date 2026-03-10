'use client';
import { useState } from 'react';
import DemoWalkthrough from './manager/demo-walkthrough';
import SampleReports from './manager/sample-reports';
import AiInsights from './manager/ai-insights';

const TABS = [
  { id: 'demo-walkthrough', label: 'Demo Walkthrough' },
  { id: 'sample-reports', label: 'Sample Reports' },
  { id: 'ai-insights', label: 'AI Insights' },
];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('demo-walkthrough');

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Demo Company</h1>
        <p className="text-gray-500 mt-1">Walk through the demo environment and explore sample reports pre-filled with realistic data</p>
      </div>

      <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
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

      <div>
        {activeTab === 'demo-walkthrough' && <DemoWalkthrough />}
        {activeTab === 'sample-reports' && <SampleReports />}
        {activeTab === 'ai-insights' && <AiInsights />}
      </div>
    </div>
  );
}
