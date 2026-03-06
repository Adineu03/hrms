'use client';

import { useState } from 'react';
import { DollarSign, FileText, Award, Shield } from 'lucide-react';
import MyCompensationTab from './tabs/employee/my-compensation-tab';
import PaySlipsTaxTab from './tabs/employee/pay-slips-tax-tab';
import RecognitionAwardsTab from './tabs/employee/recognition-awards-tab';
import BenefitsEnrollmentTab from './tabs/employee/benefits-enrollment-tab';

const TABS = [
  { id: 'my-compensation', label: 'My Compensation', icon: DollarSign },
  { id: 'pay-slips-tax', label: 'Pay Slips & Tax', icon: FileText },
  { id: 'recognition-awards', label: 'Recognition & Awards', icon: Award },
  { id: 'benefits-enrollment', label: 'Benefits Enrollment', icon: Shield },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('my-compensation');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Compensation &amp; Rewards</h1>
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
        {activeTab === 'my-compensation' && <MyCompensationTab />}
        {activeTab === 'pay-slips-tax' && <PaySlipsTaxTab />}
        {activeTab === 'recognition-awards' && <RecognitionAwardsTab />}
        {activeTab === 'benefits-enrollment' && <BenefitsEnrollmentTab />}
      </div>
    </div>
  );
}
