'use client';
import { useState } from 'react';
import { ShieldCheck, ClipboardList, Lock, Scale, Archive, Eye, BarChart3, Sparkles } from 'lucide-react';
import AiInsightsTab from './tabs/admin/ai-insights-tab';
import PolicyManagementTab from './tabs/admin/policy-management-tab';
import AuditTrailLoggingTab from './tabs/admin/audit-trail-logging-tab';
import DataPrivacyGdprTab from './tabs/admin/data-privacy-gdpr-tab';
import RegulatoryComplianceTab from './tabs/admin/regulatory-compliance-tab';
import DocumentRetentionTab from './tabs/admin/document-retention-tab';
import EthicsWhistleblowerAdminTab from './tabs/admin/ethics-whistleblower-admin-tab';
import ComplianceReportingTab from './tabs/admin/compliance-reporting-tab';

const tabs = [
  { id: 'policy-mgmt', label: 'Policy Management', icon: ShieldCheck },
  { id: 'audit-trail', label: 'Audit Trail & Logging', icon: ClipboardList },
  { id: 'data-privacy', label: 'Data Privacy & GDPR/DPDP', icon: Lock },
  { id: 'regulatory', label: 'Regulatory Compliance', icon: Scale },
  { id: 'doc-retention', label: 'Document Retention', icon: Archive },
  { id: 'ethics', label: 'Ethics & Whistleblower', icon: Eye },
  { id: 'reporting', label: 'Compliance Reporting', icon: BarChart3 },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('policy-mgmt');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Compliance & Audit</h1>
        <p className="text-sm text-gray-500 mt-1">Manage compliance policies, audit trails, and regulatory requirements</p>
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
        {activeTab === 'policy-mgmt' && <PolicyManagementTab />}
        {activeTab === 'audit-trail' && <AuditTrailLoggingTab />}
        {activeTab === 'data-privacy' && <DataPrivacyGdprTab />}
        {activeTab === 'regulatory' && <RegulatoryComplianceTab />}
        {activeTab === 'doc-retention' && <DocumentRetentionTab />}
        {activeTab === 'ethics' && <EthicsWhistleblowerAdminTab />}
        {activeTab === 'reporting' && <ComplianceReportingTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
