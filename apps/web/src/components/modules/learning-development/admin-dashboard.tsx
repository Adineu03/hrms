'use client';

import { useState } from 'react';
import {
  Settings,
  DollarSign,
  Calendar,
  BarChart3,
} from 'lucide-react';
import LmsConfigTab from './tabs/admin/lms-config-tab';
import BudgetManagementTab from './tabs/admin/budget-management-tab';
import TrainingCalendarTab from './tabs/admin/training-calendar-tab';
import ReportingAnalyticsTab from './tabs/admin/reporting-analytics-tab';

const TABS = [
  { id: 'lms-config', label: 'LMS Configuration', icon: Settings },
  { id: 'budget-management', label: 'Budget Management', icon: DollarSign },
  { id: 'training-calendar', label: 'Training Calendar', icon: Calendar },
  { id: 'reporting-analytics', label: 'Reporting & Analytics', icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('lms-config');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Learning & Development Administration</h1>

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
        {activeTab === 'lms-config' && <LmsConfigTab />}
        {activeTab === 'budget-management' && <BudgetManagementTab />}
        {activeTab === 'training-calendar' && <TrainingCalendarTab />}
        {activeTab === 'reporting-analytics' && <ReportingAnalyticsTab />}
      </div>
    </div>
  );
}
