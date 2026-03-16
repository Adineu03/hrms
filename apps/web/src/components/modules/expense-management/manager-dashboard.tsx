'use client';

import { useState } from 'react';
import { Users, CheckSquare, PieChart } from 'lucide-react';
import TeamExpenseOverviewTab from './tabs/manager/team-expense-overview-tab';
import ExpenseApprovalsTab from './tabs/manager/expense-approvals-tab';
import TeamExpenseReportsTab from './tabs/manager/team-expense-reports-tab';

const TABS = [
  { id: 'team-overview', label: 'Team Expense Overview', icon: Users },
  { id: 'approvals', label: 'Expense Approvals', icon: CheckSquare },
  { id: 'team-reports', label: 'Team Expense Reports', icon: PieChart },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('team-overview');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Expense Management — Team View</h1>
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
        {activeTab === 'team-overview' && <TeamExpenseOverviewTab />}
        {activeTab === 'approvals' && <ExpenseApprovalsTab />}
        {activeTab === 'team-reports' && <TeamExpenseReportsTab />}
      </div>
    </div>
  );
}
