'use client';
import { useState } from 'react';
import DemoOnboardingTour from './employee/demo-onboarding-tour';
import FeatureHighlights from './employee/feature-highlights';
import AiInsights from './employee/ai-insights';

const TABS = [
  { id: 'onboarding-tour', label: 'Onboarding Tour' },
  { id: 'feature-highlights', label: 'Feature Highlights' },
  { id: 'ai-insights', label: 'AI Insights' },
];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('onboarding-tour');

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Demo Company</h1>
        <p className="text-gray-500 mt-1">Explore the HRMS platform with guided tours and feature highlights</p>
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
        {activeTab === 'onboarding-tour' && <DemoOnboardingTour />}
        {activeTab === 'feature-highlights' && <FeatureHighlights />}
        {activeTab === 'ai-insights' && <AiInsights />}
      </div>
    </div>
  );
}
