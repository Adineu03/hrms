'use client';
import { useState } from 'react';
import { Users, AlertTriangle, FileCheck, BookOpen, Sparkles } from 'lucide-react';
import AiInsightsTab from './tabs/manager/ai-insights-tab';
import TeamComplianceDashboardTab from './tabs/manager/team-compliance-dashboard-tab';
import PolicyViolationTrackingTab from './tabs/manager/policy-violation-tracking-tab';
import AuditSupportTab from './tabs/manager/audit-support-tab';
import LaborLawComplianceTab from './tabs/manager/labor-law-compliance-tab';

const tabs = [
  { id: 'team-compliance', label: 'Team Compliance Dashboard', icon: Users },
  { id: 'violations', label: 'Policy Violation Tracking', icon: AlertTriangle },
  { id: 'audit-support', label: 'Audit Support', icon: FileCheck },
  { id: 'labor-law', label: 'Labor Law Compliance', icon: BookOpen },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState('team-compliance');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Compliance & Audit</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor team compliance and manage policy adherence</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
