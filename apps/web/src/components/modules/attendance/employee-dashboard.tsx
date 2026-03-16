'use client';

import { useState } from 'react';
import {
  Clock,
  CalendarDays,
  Calendar,
  Timer,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import ClockTab from './tabs/employee/clock-tab';
import MyAttendanceTab from './tabs/employee/my-attendance-tab';
import ShiftViewTab from './tabs/employee/shift-view-tab';
import OvertimeTrackerTab from './tabs/employee/overtime-tracker-tab';
import RegularizationTab from './tabs/employee/regularization-tab';
import AttendanceInsightsTab from './tabs/employee/attendance-insights-tab';

const TABS = [
  { id: 'clock', label: 'Clock In/Out', icon: Clock },
  { id: 'attendance', label: 'My Attendance', icon: CalendarDays },
  { id: 'shifts', label: 'Shift View', icon: Calendar },
  { id: 'overtime', label: 'Overtime', icon: Timer },
  { id: 'regularization', label: 'Regularization', icon: FileCheck },
  { id: 'insights', label: 'Insights', icon: TrendingUp },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('clock');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Time & Attendance - My Workspace</h1>

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
        {activeTab === 'clock' && <ClockTab />}
        {activeTab === 'attendance' && <MyAttendanceTab />}
        {activeTab === 'shifts' && <ShiftViewTab />}
        {activeTab === 'overtime' && <OvertimeTrackerTab />}
        {activeTab === 'regularization' && <RegularizationTab />}
        {activeTab === 'insights' && <AttendanceInsightsTab />}
      </div>
    </div>
  );
}
