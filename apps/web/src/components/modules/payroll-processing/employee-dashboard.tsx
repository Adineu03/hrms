'use client';

import { useState } from 'react';
import { FileText, Calculator, Banknote, Receipt, Sparkles } from 'lucide-react';
import MyPayslipsTab from './tabs/employee/my-payslips-tab';
import TaxManagementTab from './tabs/employee/tax-management-tab';
import SalaryStructureTab from './tabs/employee/salary-structure-tab';
import ReimbursementsClaimsTab from './tabs/employee/reimbursements-claims-tab';
import AiInsightsTab from './tabs/employee/ai-insights-tab';

const TABS = [
  { id: 'payslips', label: 'My Payslips', icon: FileText },
  { id: 'tax', label: 'Tax Management', icon: Calculator },
  { id: 'salary', label: 'Salary Structure', icon: Banknote },
  { id: 'reimbursements', label: 'Reimbursements & Claims', icon: Receipt },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('payslips');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Payroll Processing</h1>
      <div className="border-b border-border mb-6 overflow-x-auto">
        <div className="flex gap-1">
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
        {activeTab === 'payslips' && <MyPayslipsTab />}
        {activeTab === 'tax' && <TaxManagementTab />}
        {activeTab === 'salary' && <SalaryStructureTab />}
        {activeTab === 'reimbursements' && <ReimbursementsClaimsTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
