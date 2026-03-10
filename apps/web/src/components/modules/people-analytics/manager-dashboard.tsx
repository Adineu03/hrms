'use client';
import { useState } from 'react';
import TeamAnalyticsDashboard from './manager/team-analytics-dashboard';
import PerformanceInsights from './manager/performance-insights';
import LeaveAttendanceTrends from './manager/leave-attendance-trends';
import AiInsightsTab from './tabs/manager/ai-insights-tab';

const TABS = [
  { id: 'team-analytics', label: 'Team Analytics' },
  { id: 'performance', label: 'Performance Insights' },
  { id: 'leave-attendance', label: 'Leave & Attendance Trends' },
  { id: 'ai-insights', label: 'AI Insights' },
];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('team-analytics');

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Team Analytics</h1>
        <p className="text-gray-500 mt-1">Your team&apos;s performance, attendance, and leave insights</p>
      </div>

      <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'team-analytics' && <TeamAnalyticsDashboard />}
        {activeTab === 'performance' && <PerformanceInsights />}
        {activeTab === 'leave-attendance' && <LeaveAttendanceTrends />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
