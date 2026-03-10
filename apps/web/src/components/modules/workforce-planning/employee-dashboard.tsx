'use client';
import { useState } from 'react';
import { GitBranch, Briefcase, ArrowLeftRight, Sparkles } from 'lucide-react';
import AiInsightsTab from './tabs/employee/ai-insights-tab';
import CareerPathExplorerTab from './tabs/employee/career-path-explorer-tab';
import InternalJobBoardTab from './tabs/employee/internal-job-board-tab';
import MyTransferRequestTab from './tabs/employee/my-transfer-request-tab';

const tabs = [
  { id: 'career', label: 'Career Path Explorer', icon: GitBranch },
  { id: 'job-board', label: 'Internal Job Board', icon: Briefcase },
  { id: 'transfer', label: 'My Transfer Request', icon: ArrowLeftRight },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('career');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Workforce Planning</h1>
        <p className="text-sm text-gray-500 mt-1">Explore your career path, find internal opportunities, and manage transfer requests</p>
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
        {activeTab === 'career' && <CareerPathExplorerTab />}
        {activeTab === 'job-board' && <InternalJobBoardTab />}
        {activeTab === 'transfer' && <MyTransferRequestTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
