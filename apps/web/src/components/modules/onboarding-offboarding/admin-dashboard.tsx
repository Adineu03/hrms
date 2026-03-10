'use client';

import { useState } from 'react';
import {
  ListChecks,
  LogOut,
  FileText,
  BarChart3,
  TrendingDown,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import OnboardingWorkflowTab from './tabs/admin/onboarding-workflow-tab';
import OffboardingWorkflowTab from './tabs/admin/offboarding-workflow-tab';
import DocumentTemplateTab from './tabs/admin/document-template-tab';
import OnboardingAnalyticsTab from './tabs/admin/onboarding-analytics-tab';
import OffboardingAnalyticsTab from './tabs/admin/offboarding-analytics-tab';
import CompliancePolicyTab from './tabs/admin/compliance-policy-tab';
import AiInsightsTab from './tabs/admin/ai-insights-tab';

const TABS = [
  { id: 'onboarding-workflows', label: 'Onboarding Workflows', icon: ListChecks },
  { id: 'offboarding-workflows', label: 'Offboarding Workflows', icon: LogOut },
  { id: 'document-templates', label: 'Document Templates', icon: FileText },
  { id: 'onboarding-analytics', label: 'Onboarding Analytics', icon: BarChart3 },
  { id: 'offboarding-analytics', label: 'Offboarding Analytics', icon: TrendingDown },
  { id: 'compliance-policy', label: 'Compliance & Policy', icon: ShieldCheck },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('onboarding-workflows');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Onboarding & Offboarding Administration</h1>

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
        {activeTab === 'onboarding-workflows' && <OnboardingWorkflowTab />}
        {activeTab === 'offboarding-workflows' && <OffboardingWorkflowTab />}
        {activeTab === 'document-templates' && <DocumentTemplateTab />}
        {activeTab === 'onboarding-analytics' && <OnboardingAnalyticsTab />}
        {activeTab === 'offboarding-analytics' && <OffboardingAnalyticsTab />}
        {activeTab === 'compliance-policy' && <CompliancePolicyTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
