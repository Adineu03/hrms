'use client';

import { useState } from 'react';
import { Bell, LayoutDashboard, Zap } from 'lucide-react';
import TeamNotificationsTab from './tabs/manager/team-notifications-tab';
import CustomDashboardsTab from './tabs/manager/custom-dashboards-tab';
import QuickActionsTab from './tabs/manager/quick-actions-tab';

const TABS = [
  { id: 'team-notifications', label: 'Team Notifications', icon: Bell },
  { id: 'dashboards', label: 'Custom Dashboards', icon: LayoutDashboard },
  { id: 'quick-actions', label: 'Quick Actions', icon: Zap },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('team-notifications');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Platform &amp; Experience — Team View</h1>
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
        {activeTab === 'team-notifications' && <TeamNotificationsTab />}
        {activeTab === 'dashboards' && <CustomDashboardsTab />}
        {activeTab === 'quick-actions' && <QuickActionsTab />}
      </div>
    </div>
  );
}
