'use client';

import { useState } from 'react';
import { Settings, TrendingUp, Award, BarChart3, Sparkles } from 'lucide-react';
import SalaryStructureTab from './tabs/admin/salary-structure-tab';
import CompensationPlanningTab from './tabs/admin/compensation-planning-tab';
import RewardsRecognitionTab from './tabs/admin/rewards-recognition-tab';
import CompensationAnalyticsTab from './tabs/admin/compensation-analytics-tab';
import AiInsightsTab from './tabs/admin/ai-insights-tab';

const TABS = [
  { id: 'salary-structure', label: 'Salary Structure', icon: Settings },
  { id: 'compensation-planning', label: 'Compensation Planning', icon: TrendingUp },
  { id: 'rewards-recognition', label: 'Rewards & Recognition', icon: Award },
  { id: 'compensation-analytics', label: 'Compensation Analytics', icon: BarChart3 },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('salary-structure');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Compensation &amp; Rewards Administration</h1>
      <div className="border-b border-border mb-6 overflow-x-auto">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text hover:border-border'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border p-6">
        {activeTab === 'salary-structure' && <SalaryStructureTab />}
        {activeTab === 'compensation-planning' && <CompensationPlanningTab />}
        {activeTab === 'rewards-recognition' && <RewardsRecognitionTab />}
        {activeTab === 'compensation-analytics' && <CompensationAnalyticsTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
