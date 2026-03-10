'use client';

import { useState } from 'react';
import { Users, Award, TrendingUp, Sparkles } from 'lucide-react';
import TeamCompensationTab from './tabs/manager/team-compensation-tab';
import RecognitionManagementTab from './tabs/manager/recognition-management-tab';
import IncrementPlanningTab from './tabs/manager/increment-planning-tab';
import AiInsightsTab from './tabs/manager/ai-insights-tab';

const TABS = [
  { id: 'team-compensation', label: 'Team Compensation', icon: Users },
  { id: 'recognition-management', label: 'Recognition Management', icon: Award },
  { id: 'increment-planning', label: 'Increment Planning', icon: TrendingUp },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('team-compensation');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Compensation &amp; Rewards — Team Management</h1>
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
        {activeTab === 'team-compensation' && <TeamCompensationTab />}
        {activeTab === 'recognition-management' && <RecognitionManagementTab />}
        {activeTab === 'increment-planning' && <IncrementPlanningTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
