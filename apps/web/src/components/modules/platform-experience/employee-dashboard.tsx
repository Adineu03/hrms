'use client';

import { useState } from 'react';
import { Bell, FileText, Search, Settings } from 'lucide-react';
import NotificationCenterTab from './tabs/employee/notification-center-tab';
import SelfServicePortalTab from './tabs/employee/self-service-portal-tab';
import SearchNavigationTab from './tabs/employee/search-navigation-tab';
import MobileAccessibilityTab from './tabs/employee/mobile-accessibility-tab';

const TABS = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'self-service', label: 'Self-Service', icon: FileText },
  { id: 'search', label: 'Search & Navigation', icon: Search },
  { id: 'preferences', label: 'Preferences', icon: Settings },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('notifications');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Platform &amp; Experience</h1>
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
        {activeTab === 'notifications' && <NotificationCenterTab />}
        {activeTab === 'self-service' && <SelfServicePortalTab />}
        {activeTab === 'search' && <SearchNavigationTab />}
        {activeTab === 'preferences' && <MobileAccessibilityTab />}
      </div>
    </div>
  );
}
