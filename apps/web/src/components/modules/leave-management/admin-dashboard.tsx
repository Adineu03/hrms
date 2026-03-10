'use client';

import { useState } from 'react';
import {
  Shield,
  GitBranch,
  Calculator,
  CalendarDays,
  BarChart3,
  Gift,
  Sparkles,
} from 'lucide-react';
import LeavePolicyTab from './tabs/admin/leave-policy-tab';
import ApprovalWorkflowsTab from './tabs/admin/approval-workflows-tab';
import BalanceManagementTab from './tabs/admin/balance-management-tab';
import HolidayCalendarTab from './tabs/admin/holiday-calendar-tab';
import LeaveReportsTab from './tabs/admin/leave-reports-tab';
import CompoffRulesTab from './tabs/admin/compoff-rules-tab';
import AiInsightsTab from './tabs/admin/ai-insights-tab';

const TABS = [
  { id: 'policy', label: 'Leave Policy Config', icon: Shield },
  { id: 'workflows', label: 'Approval Workflows', icon: GitBranch },
  { id: 'balances', label: 'Balance Management', icon: Calculator },
  { id: 'holidays', label: 'Holiday Calendar', icon: CalendarDays },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'compoff', label: 'Comp-Off Rules', icon: Gift },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('policy');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Leave Management Administration</h1>

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
        {activeTab === 'policy' && <LeavePolicyTab />}
        {activeTab === 'workflows' && <ApprovalWorkflowsTab />}
        {activeTab === 'balances' && <BalanceManagementTab />}
        {activeTab === 'holidays' && <HolidayCalendarTab />}
        {activeTab === 'reports' && <LeaveReportsTab />}
        {activeTab === 'compoff' && <CompoffRulesTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
