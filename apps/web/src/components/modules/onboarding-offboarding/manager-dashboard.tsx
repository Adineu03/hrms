'use client';

import { useState } from 'react';
import {
  UserPlus,
  UserMinus,
  Users,
  Clock,
  BookOpen,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import TeamOnboardingTab from './tabs/manager/team-onboarding-tab';
import TeamOffboardingTab from './tabs/manager/team-offboarding-tab';
import BuddyAssignmentTab from './tabs/manager/buddy-assignment-tab';
import ProbationMgmtTab from './tabs/manager/probation-mgmt-tab';
import KnowledgeTransferTab from './tabs/manager/knowledge-transfer-tab';
import ExitInterviewTab from './tabs/manager/exit-interview-tab';
import AiInsightsTab from './tabs/manager/ai-insights-tab';

const TABS = [
  { id: 'team-onboarding', label: 'Team Onboarding', icon: UserPlus },
  { id: 'team-offboarding', label: 'Team Offboarding', icon: UserMinus },
  { id: 'buddy-assignment', label: 'Buddy Assignment', icon: Users },
  { id: 'probation', label: 'Probation Management', icon: Clock },
  { id: 'knowledge-transfer', label: 'Knowledge Transfer', icon: BookOpen },
  { id: 'exit-interviews', label: 'Exit Interviews', icon: MessageSquare },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('team-onboarding');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Onboarding & Offboarding — Manager View</h1>

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
        {activeTab === 'team-onboarding' && <TeamOnboardingTab />}
        {activeTab === 'team-offboarding' && <TeamOffboardingTab />}
        {activeTab === 'buddy-assignment' && <BuddyAssignmentTab />}
        {activeTab === 'probation' && <ProbationMgmtTab />}
        {activeTab === 'knowledge-transfer' && <KnowledgeTransferTab />}
        {activeTab === 'exit-interviews' && <ExitInterviewTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
