'use client';

import { useState } from 'react';
import { ClipboardList, Users, Flower2, TrendingUp } from 'lucide-react';
import SurveyParticipationTab from './tabs/employee/survey-participation-tab';
import SocialCommunityTab from './tabs/employee/social-community-tab';
import WellnessPortalTab from './tabs/employee/wellness-portal-tab';
import MyEngagementScoreTab from './tabs/employee/my-engagement-score-tab';

const TABS = [
  { id: 'surveys', label: 'Surveys', icon: ClipboardList },
  { id: 'social-community', label: 'Social & Community', icon: Users },
  { id: 'wellness-portal', label: 'Wellness Portal', icon: Flower2 },
  { id: 'my-engagement', label: 'My Engagement', icon: TrendingUp },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('surveys');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Engagement &amp; Culture</h1>
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
        {activeTab === 'surveys' && <SurveyParticipationTab />}
        {activeTab === 'social-community' && <SocialCommunityTab />}
        {activeTab === 'wellness-portal' && <WellnessPortalTab />}
        {activeTab === 'my-engagement' && <MyEngagementScoreTab />}
      </div>
    </div>
  );
}
