'use client';

import { useState } from 'react';
import {
  Users,
  Building,
  DollarSign,
  Heart,
  ShieldCheck,
  Database,
  Settings2,
} from 'lucide-react';
import EmployeeMasterTab from './tabs/admin/employee-master-tab';
import EntitiesTab from './tabs/admin/entities-tab';
import SalaryStructuresTab from './tabs/admin/salary-structures-tab';
import BenefitsTab from './tabs/admin/benefits-tab';
import ComplianceTab from './tabs/admin/compliance-tab';
import DataGovernanceTab from './tabs/admin/data-governance-tab';
import CustomFieldsTab from './tabs/admin/custom-fields-tab';

const TABS = [
  { id: 'employees', label: 'Employee Master', icon: Users },
  { id: 'entities', label: 'Entities', icon: Building },
  { id: 'salary', label: 'Salary Structures', icon: DollarSign },
  { id: 'benefits', label: 'Benefits', icon: Heart },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { id: 'governance', label: 'Data Governance', icon: Database },
  { id: 'custom-fields', label: 'Custom Fields', icon: Settings2 },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('employees');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Core HR Administration</h1>

      {/* Tab Navigation */}
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

      {/* Tab Content */}
      <div className="bg-card rounded-xl border border-border p-6">
        {activeTab === 'employees' && <EmployeeMasterTab />}
        {activeTab === 'entities' && <EntitiesTab />}
        {activeTab === 'salary' && <SalaryStructuresTab />}
        {activeTab === 'benefits' && <BenefitsTab />}
        {activeTab === 'compliance' && <ComplianceTab />}
        {activeTab === 'governance' && <DataGovernanceTab />}
        {activeTab === 'custom-fields' && <CustomFieldsTab />}
      </div>
    </div>
  );
}
