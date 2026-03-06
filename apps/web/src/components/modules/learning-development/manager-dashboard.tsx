'use client';

import { useState } from 'react';
import {
  Users,
  ClipboardList,
  TrendingUp,
} from 'lucide-react';
import TeamLearningTab from './tabs/manager/team-learning-tab';
import LearningAssignmentsTab from './tabs/manager/learning-assignments-tab';
import DevelopmentPlanningTab from './tabs/manager/development-planning-tab';

const TABS = [
  { id: 'team-learning', label: 'Team Learning', icon: Users },
  { id: 'learning-assignments', label: 'Learning Assignments', icon: ClipboardList },
  { id: 'development-planning', label: 'Development Planning', icon: TrendingUp },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('team-learning');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Learning & Development — Team Management</h1>

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
        {activeTab === 'team-learning' && <TeamLearningTab />}
        {activeTab === 'learning-assignments' && <LearningAssignmentsTab />}
        {activeTab === 'development-planning' && <DevelopmentPlanningTab />}
      </div>
    </div>
  );
}
