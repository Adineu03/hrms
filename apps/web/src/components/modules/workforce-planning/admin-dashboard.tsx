'use client';
import { useState } from 'react';
import { Users, DollarSign, Building2, Layers, Star, ArrowLeftRight, BarChart3, Sparkles } from 'lucide-react';
import AiInsightsTab from './tabs/admin/ai-insights-tab';
import HeadcountPlanningTab from './tabs/admin/headcount-planning-tab';
import BudgetManagementTab from './tabs/admin/budget-management-tab';
import OrgDesignStudioTab from './tabs/admin/org-design-studio-tab';
import RoleGradeArchitectureTab from './tabs/admin/role-grade-architecture-tab';
import SuccessionPlanningTab from './tabs/admin/succession-planning-tab';
import InternalMobilityTransfersTab from './tabs/admin/internal-mobility-transfers-tab';
import WorkforceAnalyticsDashboardTab from './tabs/admin/workforce-analytics-dashboard-tab';

const tabs = [
  { id: 'headcount', label: 'Headcount Planning', icon: Users },
  { id: 'budget', label: 'Budget Management', icon: DollarSign },
  { id: 'org-design', label: 'Org Design Studio', icon: Building2 },
  { id: 'role-grade', label: 'Role & Grade Architecture', icon: Layers },
  { id: 'succession', label: 'Succession Planning', icon: Star },
  { id: 'mobility', label: 'Internal Mobility & Transfers', icon: ArrowLeftRight },
  { id: 'analytics', label: 'Workforce Analytics', icon: BarChart3 },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('headcount');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Workforce Planning</h1>
        <p className="text-sm text-gray-500 mt-1">Manage headcount, budgets, org design, succession, and workforce analytics</p>
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
        {activeTab === 'headcount' && <HeadcountPlanningTab />}
        {activeTab === 'budget' && <BudgetManagementTab />}
        {activeTab === 'org-design' && <OrgDesignStudioTab />}
        {activeTab === 'role-grade' && <RoleGradeArchitectureTab />}
        {activeTab === 'succession' && <SuccessionPlanningTab />}
        {activeTab === 'mobility' && <InternalMobilityTransfersTab />}
        {activeTab === 'analytics' && <WorkforceAnalyticsDashboardTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
