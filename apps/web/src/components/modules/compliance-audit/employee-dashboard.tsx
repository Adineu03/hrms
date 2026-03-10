'use client';
import { useState } from 'react';
import { CheckSquare, GraduationCap, MessageSquare, Shield, Sparkles } from 'lucide-react';
import AiInsightsTab from './tabs/employee/ai-insights-tab';
import PolicyAcknowledgmentTab from './tabs/employee/policy-acknowledgment-tab';
import MandatoryTrainingTrackerTab from './tabs/employee/mandatory-training-tracker-tab';
import WhistleblowerEthicsPortalTab from './tabs/employee/whistleblower-ethics-portal-tab';
import DataPrivacyControlsTab from './tabs/employee/data-privacy-controls-tab';

const tabs = [
  { id: 'policy-ack', label: 'Policy Acknowledgment', icon: CheckSquare },
  { id: 'mandatory-training', label: 'Mandatory Training Tracker', icon: GraduationCap },
  { id: 'ethics-portal', label: 'Whistleblower & Ethics Portal', icon: MessageSquare },
  { id: 'data-privacy', label: 'Data Privacy Controls', icon: Shield },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('policy-ack');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Compliance & Audit</h1>
        <p className="text-sm text-gray-500 mt-1">Review and acknowledge policies, complete mandatory training, and manage your data</p>
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
        {activeTab === 'policy-ack' && <PolicyAcknowledgmentTab />}
        {activeTab === 'mandatory-training' && <MandatoryTrainingTrackerTab />}
        {activeTab === 'ethics-portal' && <WhistleblowerEthicsPortalTab />}
        {activeTab === 'data-privacy' && <DataPrivacyControlsTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
