'use client';
import { useState } from 'react';
import { Users, Star, ArrowLeftRight, PieChart } from 'lucide-react';
import TeamHeadcountViewTab from './tabs/manager/team-headcount-view-tab';
import TeamSuccessionDashboardTab from './tabs/manager/team-succession-dashboard-tab';
import TransferMobilityRequestsTab from './tabs/manager/transfer-mobility-requests-tab';
import TeamCompositionAnalyticsTab from './tabs/manager/team-composition-analytics-tab';

const tabs = [
  { id: 'team-headcount', label: 'Team Headcount', icon: Users },
  { id: 'team-succession', label: 'Succession Dashboard', icon: Star },
  { id: 'transfers', label: 'Transfer & Mobility Requests', icon: ArrowLeftRight },
  { id: 'composition', label: 'Team Composition', icon: PieChart },
];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('team-headcount');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Workforce Planning</h1>
        <p className="text-sm text-gray-500 mt-1">View your team headcount, succession plans, and manage transfer requests</p>
      </div>

      <div className="border-b border-border mb-6 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text hover:border-border'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {activeTab === 'team-headcount' && <TeamHeadcountViewTab />}
        {activeTab === 'team-succession' && <TeamSuccessionDashboardTab />}
        {activeTab === 'transfers' && <TransferMobilityRequestsTab />}
        {activeTab === 'composition' && <TeamCompositionAnalyticsTab />}
      </div>
    </div>
  );
}
