'use client';

import { useState } from 'react';
import { Settings, PlayCircle, Shield, BarChart3, Sparkles } from 'lucide-react';
import PayrollConfigurationTab from './tabs/admin/payroll-configuration-tab';
import PayrollRunTab from './tabs/admin/payroll-run-tab';
import StatutoryComplianceTab from './tabs/admin/statutory-compliance-tab';
import PayrollReportsTab from './tabs/admin/payroll-reports-tab';
import AiInsightsTab from './tabs/admin/ai-insights-tab';

const TABS = [
  { id: 'configuration', label: 'Payroll Configuration', icon: Settings },
  { id: 'runs', label: 'Payroll Processing', icon: PlayCircle },
  { id: 'statutory', label: 'Statutory Compliance', icon: Shield },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('configuration');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Payroll Processing Administration</h1>
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
        {activeTab === 'configuration' && <PayrollConfigurationTab />}
        {activeTab === 'runs' && <PayrollRunTab />}
        {activeTab === 'statutory' && <StatutoryComplianceTab />}
        {activeTab === 'reports' && <PayrollReportsTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
