'use client';
import { useState } from 'react';
import { GitBranch, Briefcase, ArrowLeftRight } from 'lucide-react';
import CareerPathExplorerTab from './tabs/employee/career-path-explorer-tab';
import InternalJobBoardTab from './tabs/employee/internal-job-board-tab';
import MyTransferRequestTab from './tabs/employee/my-transfer-request-tab';

const tabs = [
  { id: 'career', label: 'Career Path Explorer', icon: GitBranch },
  { id: 'job-board', label: 'Internal Job Board', icon: Briefcase },
  { id: 'transfer', label: 'My Transfer Request', icon: ArrowLeftRight },
];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('career');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2c2c2c]">Workforce Planning</h1>
        <p className="text-sm text-gray-500 mt-1">Explore your career path, find internal opportunities, and manage transfer requests</p>
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
        {activeTab === 'career' && <CareerPathExplorerTab />}
        {activeTab === 'job-board' && <InternalJobBoardTab />}
        {activeTab === 'transfer' && <MyTransferRequestTab />}
      </div>
    </div>
  );
}
