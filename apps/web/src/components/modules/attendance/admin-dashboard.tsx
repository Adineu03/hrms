'use client';

import { useState } from 'react';
import {
  Clock,
  Shield,
  Timer,
  BarChart3,
  PenTool,
  Plug,
} from 'lucide-react';
import ShiftManagementTab from './tabs/admin/shift-management-tab';
import AttendancePoliciesTab from './tabs/admin/attendance-policies-tab';
import OvertimeConfigTab from './tabs/admin/overtime-config-tab';
import ReportsAnalyticsTab from './tabs/admin/reports-analytics-tab';
import AttendanceCorrectionsTab from './tabs/admin/attendance-corrections-tab';
import IntegrationSettingsTab from './tabs/admin/integration-settings-tab';

const TABS = [
  { id: 'shifts', label: 'Shift Management', icon: Clock },
  { id: 'policies', label: 'Attendance Policies', icon: Shield },
  { id: 'overtime', label: 'Overtime Config', icon: Timer },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'corrections', label: 'Corrections', icon: PenTool },
  { id: 'integrations', label: 'Integrations', icon: Plug },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('shifts');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Time & Attendance Administration</h1>

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
        {activeTab === 'shifts' && <ShiftManagementTab />}
        {activeTab === 'policies' && <AttendancePoliciesTab />}
        {activeTab === 'overtime' && <OvertimeConfigTab />}
        {activeTab === 'reports' && <ReportsAnalyticsTab />}
        {activeTab === 'corrections' && <AttendanceCorrectionsTab />}
        {activeTab === 'integrations' && <IntegrationSettingsTab />}
      </div>
    </div>
  );
}
