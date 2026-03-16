'use client';

import { useState } from 'react';
import {
  Users,
  Target,
  MessageSquare,
  Calendar,
  TrendingUp,
  Star,
} from 'lucide-react';
import TeamPerformanceTab from './tabs/manager/team-performance-tab';
import GoalManagementTab from './tabs/manager/goal-management-tab';
import ReviewFeedbackTab from './tabs/manager/review-feedback-tab';
import OneOnOneTab from './tabs/manager/one-on-one-tab';
import TeamDevelopmentTab from './tabs/manager/team-development-tab';
import TalentAssessmentTab from './tabs/manager/talent-assessment-tab';

const TABS = [
  { id: 'team-dashboard', label: 'Team Performance', icon: Users },
  { id: 'goals', label: 'Goal Management', icon: Target },
  { id: 'reviews', label: 'Reviews & Feedback', icon: MessageSquare },
  { id: 'one-on-ones', label: '1-on-1 Meetings', icon: Calendar },
  { id: 'development', label: 'Team Development', icon: TrendingUp },
  { id: 'talent', label: 'Talent Assessment', icon: Star },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('team-dashboard');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Performance & Growth — Team Management</h1>

      <div className="border-b border-border mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
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
        {activeTab === 'team-dashboard' && <TeamPerformanceTab />}
        {activeTab === 'goals' && <GoalManagementTab />}
        {activeTab === 'reviews' && <ReviewFeedbackTab />}
        {activeTab === 'one-on-ones' && <OneOnOneTab />}
        {activeTab === 'development' && <TeamDevelopmentTab />}
        {activeTab === 'talent' && <TalentAssessmentTab />}
      </div>
    </div>
  );
}
