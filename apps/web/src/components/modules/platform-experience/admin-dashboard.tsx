'use client';

import { useState } from 'react';
import { Bell, Palette, Search, Shield, Sparkles } from 'lucide-react';
import NotificationAlertManagementTab from './tabs/admin/notification-alert-management-tab';
import PlatformCustomizationTab from './tabs/admin/platform-customization-tab';
import SearchNavigationConfigTab from './tabs/admin/search-navigation-config-tab';
import SystemAdministrationTab from './tabs/admin/system-administration-tab';
import AiInsightsTab from './tabs/admin/ai-insights-tab';

const TABS = [
  { id: 'notifications', label: 'Notification Management', icon: Bell },
  { id: 'customization', label: 'Platform Customization', icon: Palette },
  { id: 'search-nav', label: 'Search & Navigation', icon: Search },
  { id: 'system', label: 'System Administration', icon: Shield },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('notifications');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Platform &amp; Experience Administration</h1>
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
        {activeTab === 'notifications' && <NotificationAlertManagementTab />}
        {activeTab === 'customization' && <PlatformCustomizationTab />}
        {activeTab === 'search-nav' && <SearchNavigationConfigTab />}
        {activeTab === 'system' && <SystemAdministrationTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
