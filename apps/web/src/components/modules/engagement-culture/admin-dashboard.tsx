'use client';

import { useState } from 'react';
import { ClipboardList, Heart, Flower2, BarChart3, Sparkles } from 'lucide-react';
import SurveyPulseManagementTab from './tabs/admin/survey-pulse-management-tab';
import CultureValuesSetupTab from './tabs/admin/culture-values-setup-tab';
import WellnessProgramManagementTab from './tabs/admin/wellness-program-management-tab';
import EngagementAnalyticsTab from './tabs/admin/engagement-analytics-tab';
import AiInsightsTab from './tabs/admin/ai-insights-tab';

const TABS = [
  { id: 'survey-pulse', label: 'Survey & Pulse', icon: ClipboardList },
  { id: 'culture-values', label: 'Culture & Values', icon: Heart },
  { id: 'wellness', label: 'Wellness Programs', icon: Flower2 },
  { id: 'analytics', label: 'Engagement Analytics', icon: BarChart3 },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('survey-pulse');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Engagement &amp; Culture Administration</h1>
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
        {activeTab === 'survey-pulse' && <SurveyPulseManagementTab />}
        {activeTab === 'culture-values' && <CultureValuesSetupTab />}
        {activeTab === 'wellness' && <WellnessProgramManagementTab />}
        {activeTab === 'analytics' && <EngagementAnalyticsTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
