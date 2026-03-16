'use client';

import { useState } from 'react';
import {
  Users,
  Calendar,
  Timer,
  FileCheck,
  BarChart3,
  CalendarDays,
} from 'lucide-react';
import TeamDashboardTab from './tabs/manager/team-dashboard-tab';
import ShiftPlanningTab from './tabs/manager/shift-planning-tab';
import OvertimeApprovalTab from './tabs/manager/overtime-approval-tab';
import TeamRegularizationTab from './tabs/manager/team-regularization-tab';
import TeamReportsTab from './tabs/manager/team-reports-tab';
import LeaveCorrelationTab from './tabs/manager/leave-correlation-tab';

const TABS = [
  { id: 'dashboard', label: 'Team Dashboard', icon: Users },
  { id: 'shifts', label: 'Shift Planning', icon: Calendar },
  { id: 'overtime', label: 'OT Approval', icon: Timer },
  { id: 'regularization', label: 'Regularization', icon: FileCheck },
  { id: 'reports', label: 'Team Reports', icon: BarChart3 },
  { id: 'leave-correlation', label: 'Leave & Attendance', icon: CalendarDays },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Time & Attendance - Team Management</h1>

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
        {activeTab === 'shifts' && <ShiftPlanningTab />}
        {activeTab === 'overtime' && <OvertimeApprovalTab />}
        {activeTab === 'regularization' && <TeamRegularizationTab />}
        {activeTab === 'reports' && <TeamReportsTab />}
        {activeTab === 'leave-correlation' && <LeaveCorrelationTab />}
      </div>
    </div>
  );
}
