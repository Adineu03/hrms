'use client';
import { useState } from 'react';
import { CheckSquare, GraduationCap, MessageSquare, Shield } from 'lucide-react';
import PolicyAcknowledgmentTab from './tabs/employee/policy-acknowledgment-tab';
import MandatoryTrainingTrackerTab from './tabs/employee/mandatory-training-tracker-tab';
import WhistleblowerEthicsPortalTab from './tabs/employee/whistleblower-ethics-portal-tab';
import DataPrivacyControlsTab from './tabs/employee/data-privacy-controls-tab';

const tabs = [
  { id: 'policy-ack', label: 'Policy Acknowledgment', icon: CheckSquare },
  { id: 'mandatory-training', label: 'Mandatory Training Tracker', icon: GraduationCap },
  { id: 'ethics-portal', label: 'Whistleblower & Ethics Portal', icon: MessageSquare },
  { id: 'data-privacy', label: 'Data Privacy Controls', icon: Shield },
];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('policy-ack');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Compliance & Audit</h1>
        <p className="text-sm text-gray-500 mt-1">Review and acknowledge policies, complete mandatory training, and manage your data</p>
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
        {activeTab === 'policy-ack' && <PolicyAcknowledgmentTab />}
        {activeTab === 'mandatory-training' && <MandatoryTrainingTrackerTab />}
        {activeTab === 'ethics-portal' && <WhistleblowerEthicsPortalTab />}
        {activeTab === 'data-privacy' && <DataPrivacyControlsTab />}
      </div>
    </div>
  );
}
