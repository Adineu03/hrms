'use client';
import { useState } from 'react';
import { Users, AlertTriangle, FileCheck, BookOpen } from 'lucide-react';
import TeamComplianceDashboardTab from './tabs/manager/team-compliance-dashboard-tab';
import PolicyViolationTrackingTab from './tabs/manager/policy-violation-tracking-tab';
import AuditSupportTab from './tabs/manager/audit-support-tab';
import LaborLawComplianceTab from './tabs/manager/labor-law-compliance-tab';

const tabs = [
  { id: 'team-compliance', label: 'Team Compliance Dashboard', icon: Users },
  { id: 'violations', label: 'Policy Violation Tracking', icon: AlertTriangle },
  { id: 'audit-support', label: 'Audit Support', icon: FileCheck },
  { id: 'labor-law', label: 'Labor Law Compliance', icon: BookOpen },
];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('team-compliance');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Compliance & Audit</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor team compliance and manage policy adherence</p>
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
        {activeTab === 'team-compliance' && <TeamComplianceDashboardTab />}
        {activeTab === 'violations' && <PolicyViolationTrackingTab />}
        {activeTab === 'audit-support' && <AuditSupportTab />}
        {activeTab === 'labor-law' && <LaborLawComplianceTab />}
      </div>
    </div>
  );
}
