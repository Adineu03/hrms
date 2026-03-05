'use client';

import { useState } from 'react';
import {
  Users,
  Network,
  DollarSign,
  BarChart3,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import TeamDirectoryTab from './tabs/manager/team-directory-tab';
import TeamOrgTab from './tabs/manager/team-org-tab';
import CompensationTab from './tabs/manager/compensation-tab';
import HeadcountTab from './tabs/manager/headcount-tab';
import TeamComplianceTab from './tabs/manager/team-compliance-tab';
import ChangeRequestsTab from './tabs/manager/change-requests-tab';

const TABS = [
  { id: 'team', label: 'Team Directory', icon: Users },
  { id: 'org', label: 'Org Management', icon: Network },
  { id: 'compensation', label: 'Compensation', icon: DollarSign },
  { id: 'headcount', label: 'Headcount', icon: BarChart3 },
  { id: 'compliance', label: 'Team Compliance', icon: ShieldCheck },
  { id: 'requests', label: 'Change Requests', icon: FileText },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('team');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Core HR - Team Management</h1>

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
        {activeTab === 'team' && <TeamDirectoryTab />}
        {activeTab === 'org' && <TeamOrgTab />}
        {activeTab === 'compensation' && <CompensationTab />}
        {activeTab === 'headcount' && <HeadcountTab />}
        {activeTab === 'compliance' && <TeamComplianceTab />}
        {activeTab === 'requests' && <ChangeRequestsTab />}
      </div>
    </div>
  );
}
