'use client';

import { useState } from 'react';
import { Settings, FileText, BarChart3, Sparkles } from 'lucide-react';
import ExpensePolicyConfigurationTab from './tabs/admin/expense-policy-configuration-tab';
import ExpenseReportManagementTab from './tabs/admin/expense-report-management-tab';
import ExpenseAnalyticsTab from './tabs/admin/expense-analytics-tab';
import AiInsightsTab from './tabs/admin/ai-insights-tab';

const TABS = [
  { id: 'policy-config', label: 'Expense Policy Configuration', icon: Settings },
  { id: 'report-management', label: 'Expense Report Management', icon: FileText },
  { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('policy-config');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Expense Management Administration</h1>
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
        {activeTab === 'policy-config' && <ExpensePolicyConfigurationTab />}
        {activeTab === 'report-management' && <ExpenseReportManagementTab />}
        {activeTab === 'analytics' && <ExpenseAnalyticsTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
