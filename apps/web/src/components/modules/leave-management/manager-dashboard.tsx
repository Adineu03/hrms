'use client';

import { useState } from 'react';
import {
  CalendarDays,
  CheckSquare,
  Calculator,
  Target,
  BarChart3,
  UserCog,
  Sparkles,
} from 'lucide-react';
import TeamCalendarTab from './tabs/manager/team-calendar-tab';
import ApprovalQueueTab from './tabs/manager/approval-queue-tab';
import TeamBalanceTab from './tabs/manager/team-balance-tab';
import LeavePlanningTab from './tabs/manager/leave-planning-tab';
import LeaveReportsTab from './tabs/manager/leave-reports-tab';
import DelegationTab from './tabs/manager/delegation-tab';
import AiInsightsTab from './tabs/manager/ai-insights-tab';

const TABS = [
  { id: 'calendar', label: 'Team Leave Calendar', icon: CalendarDays },
  { id: 'approvals', label: 'Approval Queue', icon: CheckSquare },
  { id: 'balances', label: 'Team Balances', icon: Calculator },
  { id: 'planning', label: 'Leave Planning', icon: Target },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'delegation', label: 'Delegation', icon: UserCog },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('calendar');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Leave Management — Team</h1>

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
        {activeTab === 'calendar' && <TeamCalendarTab />}
        {activeTab === 'approvals' && <ApprovalQueueTab />}
        {activeTab === 'balances' && <TeamBalanceTab />}
        {activeTab === 'planning' && <LeavePlanningTab />}
        {activeTab === 'reports' && <LeaveReportsTab />}
        {activeTab === 'delegation' && <DelegationTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
