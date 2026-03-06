'use client';

import { useState } from 'react';
import { Users, Heart, MessageSquare } from 'lucide-react';
import TeamEngagementTab from './tabs/manager/team-engagement-tab';
import TeamWellnessTab from './tabs/manager/team-wellness-tab';
import FeedbackSuggestionsTab from './tabs/manager/feedback-suggestions-tab';

const TABS = [
  { id: 'team-engagement', label: 'Team Engagement', icon: Users },
  { id: 'team-wellness', label: 'Team Wellness', icon: Heart },
  { id: 'feedback-suggestions', label: 'Feedback & Suggestions', icon: MessageSquare },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('team-engagement');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Engagement &amp; Culture — Team View</h1>
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
        {activeTab === 'team-engagement' && <TeamEngagementTab />}
        {activeTab === 'team-wellness' && <TeamWellnessTab />}
        {activeTab === 'feedback-suggestions' && <FeedbackSuggestionsTab />}
      </div>
    </div>
  );
}
