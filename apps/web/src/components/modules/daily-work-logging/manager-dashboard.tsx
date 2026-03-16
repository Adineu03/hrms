'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  TrendingUp,
  Users,
  ClipboardCheck,
} from 'lucide-react';
import TeamDashboardTab from './tabs/manager/team-dashboard-tab';
import ApprovalQueueTab from './tabs/manager/approval-queue-tab';
import ProjectTrackingTab from './tabs/manager/project-tracking-tab';
import TeamProductivityTab from './tabs/manager/team-productivity-tab';
import ResourceAllocationTab from './tabs/manager/resource-allocation-tab';
import TimesheetComplianceTab from './tabs/manager/timesheet-compliance-tab';

const TABS = [
  { id: 'dashboard', label: 'Team Dashboard', icon: LayoutDashboard },
  { id: 'approvals', label: 'Approval Queue', icon: CheckSquare },
  { id: 'projects', label: 'Project Tracking', icon: FolderKanban },
  { id: 'productivity', label: 'Productivity', icon: TrendingUp },
  { id: 'resources', label: 'Resource Allocation', icon: Users },
  { id: 'compliance', label: 'Compliance', icon: ClipboardCheck },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Daily Work Logging — Team</h1>

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
        {activeTab === 'dashboard' && <TeamDashboardTab />}
        {activeTab === 'approvals' && <ApprovalQueueTab />}
        {activeTab === 'projects' && <ProjectTrackingTab />}
        {activeTab === 'productivity' && <TeamProductivityTab />}
        {activeTab === 'resources' && <ResourceAllocationTab />}
        {activeTab === 'compliance' && <TimesheetComplianceTab />}
      </div>
    </div>
  );
}
