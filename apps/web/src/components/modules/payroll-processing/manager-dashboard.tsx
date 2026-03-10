'use client';

import { useState } from 'react';
import { Users, CheckSquare, PieChart, Sparkles } from 'lucide-react';
import TeamPayrollOverviewTab from './tabs/manager/team-payroll-overview-tab';
import PayrollApprovalsTab from './tabs/manager/payroll-approvals-tab';
import TeamCostReportsTab from './tabs/manager/team-cost-reports-tab';
import AiInsightsTab from './tabs/manager/ai-insights-tab';

const TABS = [
  { id: 'team-overview', label: 'Team Payroll Overview', icon: Users },
  { id: 'approvals', label: 'Approval Workflows', icon: CheckSquare },
  { id: 'cost-reports', label: 'Team Cost Reports', icon: PieChart },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('team-overview');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Payroll Processing — Team View</h1>
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
        {activeTab === 'team-overview' && <TeamPayrollOverviewTab />}
        {activeTab === 'approvals' && <PayrollApprovalsTab />}
        {activeTab === 'cost-reports' && <TeamCostReportsTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
