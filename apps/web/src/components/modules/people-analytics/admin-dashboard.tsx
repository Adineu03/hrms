'use client';
import { useState } from 'react';
import ReportBuilder from './admin/report-builder';
import HrDashboards from './admin/hr-dashboards';
import WorkforceAnalytics from './admin/workforce-analytics';
import ComplianceAnalytics from './admin/compliance-analytics';
import CustomMetrics from './admin/custom-metrics';
import AiInsightsTab from './tabs/admin/ai-insights-tab';

const TABS = [
  { id: 'hr-dashboards', label: 'HR Dashboards' },
  { id: 'workforce', label: 'Workforce Analytics' },
  { id: 'compliance', label: 'Compliance Analytics' },
  { id: 'custom-metrics', label: 'Custom Metrics & KPIs' },
  { id: 'report-builder', label: 'Report Builder' },
  { id: 'ai-insights', label: 'AI Insights' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('hr-dashboards');

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2c2c2c]">People Analytics &amp; BI</h1>
        <p className="text-gray-500 mt-1">Org-wide insights, workforce trends, compliance metrics, and custom KPIs</p>
      </div>

      <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit flex-wrap">
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
        {activeTab === 'hr-dashboards' && <HrDashboards />}
        {activeTab === 'workforce' && <WorkforceAnalytics />}
        {activeTab === 'compliance' && <ComplianceAnalytics />}
        {activeTab === 'custom-metrics' && <CustomMetrics />}
        {activeTab === 'report-builder' && <ReportBuilder />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
