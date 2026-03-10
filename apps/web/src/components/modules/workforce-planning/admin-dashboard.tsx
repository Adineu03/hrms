'use client';
import { useState } from 'react';
import { Users, DollarSign, Building2, Layers, Star, ArrowLeftRight, BarChart3 } from 'lucide-react';
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
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('headcount');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Workforce Planning</h1>
        <p className="text-sm text-gray-500 mt-1">Manage headcount, budgets, org design, succession, and workforce analytics</p>
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
        {activeTab === 'headcount' && <HeadcountPlanningTab />}
        {activeTab === 'budget' && <BudgetManagementTab />}
        {activeTab === 'org-design' && <OrgDesignStudioTab />}
        {activeTab === 'role-grade' && <RoleGradeArchitectureTab />}
        {activeTab === 'succession' && <SuccessionPlanningTab />}
        {activeTab === 'mobility' && <InternalMobilityTransfersTab />}
        {activeTab === 'analytics' && <WorkforceAnalyticsDashboardTab />}
      </div>
    </div>
  );
}
