'use client';

import { useState } from 'react';
import {
  PlusCircle,
  Wallet,
  Clock,
  CalendarDays,
  Gift,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import ApplyLeaveTab from './tabs/employee/apply-leave-tab';
import LeaveBalanceTab from './tabs/employee/leave-balance-tab';
import LeaveHistoryTab from './tabs/employee/leave-history-tab';
import LeaveCalendarTab from './tabs/employee/leave-calendar-tab';
import CompoffTab from './tabs/employee/compoff-tab';
import LeaveInsightsTab from './tabs/employee/leave-insights-tab';
import AiInsightsTab from './tabs/employee/ai-insights-tab';

const TABS = [
  { id: 'apply', label: 'Apply Leave', icon: PlusCircle },
  { id: 'balance', label: 'Leave Balance', icon: Wallet },
  { id: 'history', label: 'Leave History', icon: Clock },
  { id: 'calendar', label: 'Leave Calendar', icon: CalendarDays },
  { id: 'compoff', label: 'Comp-Off', icon: Gift },
  { id: 'insights', label: 'Insights', icon: TrendingUp },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('apply');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Leave Management</h1>

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
        {activeTab === 'apply' && <ApplyLeaveTab />}
        {activeTab === 'balance' && <LeaveBalanceTab />}
        {activeTab === 'history' && <LeaveHistoryTab />}
        {activeTab === 'calendar' && <LeaveCalendarTab />}
        {activeTab === 'compoff' && <CompoffTab />}
        {activeTab === 'insights' && <LeaveInsightsTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
