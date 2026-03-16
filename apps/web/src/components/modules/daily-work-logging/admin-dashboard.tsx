'use client';

import { useState } from 'react';
import {
  Settings,
  FolderOpen,
  GitBranch,
  BarChart3,
  Edit3,
  Download,
} from 'lucide-react';
import TimesheetPolicyTab from './tabs/admin/timesheet-policy-tab';
import ProjectConfigTab from './tabs/admin/project-config-tab';
import ApprovalWorkflowsTab from './tabs/admin/approval-workflows-tab';
import TimesheetReportsTab from './tabs/admin/timesheet-reports-tab';
import TimesheetCorrectionsTab from './tabs/admin/timesheet-corrections-tab';
import IntegrationExportTab from './tabs/admin/integration-export-tab';

const TABS = [
  { id: 'policy', label: 'Timesheet Policy', icon: Settings },
  { id: 'projects', label: 'Projects & Tasks', icon: FolderOpen },
  { id: 'workflows', label: 'Approval Workflows', icon: GitBranch },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'corrections', label: 'Corrections', icon: Edit3 },
  { id: 'integrations', label: 'Integration & Export', icon: Download },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('policy');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Daily Work Logging Administration</h1>

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
        {activeTab === 'policy' && <TimesheetPolicyTab />}
        {activeTab === 'projects' && <ProjectConfigTab />}
        {activeTab === 'workflows' && <ApprovalWorkflowsTab />}
        {activeTab === 'reports' && <TimesheetReportsTab />}
        {activeTab === 'corrections' && <TimesheetCorrectionsTab />}
        {activeTab === 'integrations' && <IntegrationExportTab />}
      </div>
    </div>
  );
}
