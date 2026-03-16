'use client';

import { useState } from 'react';
import {
  User,
  FolderOpen,
  Network,
  Receipt,
  Heart,
  FileText,
} from 'lucide-react';
import MyProfileTab from './tabs/employee/my-profile-tab';
import DocumentVaultTab from './tabs/employee/document-vault-tab';
import OrgChartTab from './tabs/employee/org-chart-tab';
import PayslipTab from './tabs/employee/payslip-tab';
import BenefitsTab from './tabs/employee/benefits-tab';
import SelfServiceTab from './tabs/employee/self-service-tab';

const TABS = [
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'documents', label: 'Document Vault', icon: FolderOpen },
  { id: 'org-chart', label: 'Org Chart', icon: Network },
  { id: 'payslip', label: 'Payslip & Tax', icon: Receipt },
  { id: 'benefits', label: 'Benefits', icon: Heart },
  { id: 'requests', label: 'Self-Service', icon: FileText },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Core HR - My Workspace</h1>

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
        {activeTab === 'profile' && <MyProfileTab />}
        {activeTab === 'documents' && <DocumentVaultTab />}
        {activeTab === 'org-chart' && <OrgChartTab />}
        {activeTab === 'payslip' && <PayslipTab />}
        {activeTab === 'benefits' && <BenefitsTab />}
        {activeTab === 'requests' && <SelfServiceTab />}
      </div>
    </div>
  );
}
