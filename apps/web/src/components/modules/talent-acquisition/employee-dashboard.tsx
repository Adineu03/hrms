'use client';

import { useState } from 'react';
import {
  Briefcase,
  Share2,
  FileText,
  Calendar,
  UserCircle,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import InternalJobBoardTab from './tabs/employee/internal-job-board-tab';
import EmployeeReferralTab from './tabs/employee/employee-referral-tab';
import MyApplicationsTab from './tabs/employee/my-applications-tab';
import InterviewScheduleTab from './tabs/employee/interview-schedule-tab';
import CareerProfileTab from './tabs/employee/career-profile-tab';
import OfferJoiningTab from './tabs/employee/offer-joining-tab';
import AiInsightsTab from './tabs/employee/ai-insights-tab';

const TABS = [
  { id: 'jobs', label: 'Internal Job Board', icon: Briefcase },
  { id: 'referrals', label: 'Employee Referral', icon: Share2 },
  { id: 'applications', label: 'My Applications', icon: FileText },
  { id: 'interviews', label: 'Interview Schedule', icon: Calendar },
  { id: 'profile', label: 'Career Profile', icon: UserCircle },
  { id: 'offers', label: 'Offer & Joining', icon: FileCheck },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('jobs');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Talent Acquisition — Employee View</h1>

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
        {activeTab === 'jobs' && <InternalJobBoardTab />}
        {activeTab === 'referrals' && <EmployeeReferralTab />}
        {activeTab === 'applications' && <MyApplicationsTab />}
        {activeTab === 'interviews' && <InterviewScheduleTab />}
        {activeTab === 'profile' && <CareerProfileTab />}
        {activeTab === 'offers' && <OfferJoiningTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
