'use client';

import { useState } from 'react';
import {
  Clock,
  CalendarDays,
  ListTodo,
  History,
  BarChart3,
  Timer,
  Sparkles,
} from 'lucide-react';
import DailyTimesheetTab from './tabs/employee/daily-timesheet-tab';
import WeeklyTimesheetTab from './tabs/employee/weekly-timesheet-tab';
import ActivityLogTab from './tabs/employee/activity-log-tab';
import TimesheetHistoryTab from './tabs/employee/timesheet-history-tab';
import ProductivityDashboardTab from './tabs/employee/productivity-dashboard-tab';
import TimerTab from './tabs/employee/timer-tab';
import AiInsightsTab from './tabs/employee/ai-insights-tab';

const TABS = [
  { id: 'timesheet', label: 'Daily Timesheet', icon: Clock },
  { id: 'weekly', label: 'Weekly View', icon: CalendarDays },
  { id: 'activities', label: 'Activity Log', icon: ListTodo },
  { id: 'history', label: 'History', icon: History },
  { id: 'productivity', label: 'My Productivity', icon: BarChart3 },
  { id: 'timer', label: 'Timer', icon: Timer },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('timesheet');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Daily Work Logging</h1>

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
        {activeTab === 'timesheet' && <DailyTimesheetTab />}
        {activeTab === 'weekly' && <WeeklyTimesheetTab />}
        {activeTab === 'activities' && <ActivityLogTab />}
        {activeTab === 'history' && <TimesheetHistoryTab />}
        {activeTab === 'productivity' && <ProductivityDashboardTab />}
        {activeTab === 'timer' && <TimerTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
