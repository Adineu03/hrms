'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Video,
  UserSearch,
  BarChart3,
  Share2,
  FileCheck,
} from 'lucide-react';
import MyRequisitionsTab from './tabs/manager/my-requisitions-tab';
import InterviewMgmtTab from './tabs/manager/interview-mgmt-tab';
import CandidateReviewTab from './tabs/manager/candidate-review-tab';
import TeamHiringReportsTab from './tabs/manager/team-hiring-reports-tab';
import ReferralMgmtTab from './tabs/manager/referral-mgmt-tab';
import OfferApprovalTab from './tabs/manager/offer-approval-tab';

const TABS = [
  { id: 'requisitions', label: 'My Requisitions', icon: LayoutDashboard },
  { id: 'interviews', label: 'Interview Management', icon: Video },
  { id: 'candidates', label: 'Candidate Review', icon: UserSearch },
  { id: 'reports', label: 'Hiring Reports', icon: BarChart3 },
  { id: 'referrals', label: 'Referrals', icon: Share2 },
  { id: 'offers', label: 'Offer Approval', icon: FileCheck },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('requisitions');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Talent Acquisition — Manager View</h1>

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
        {activeTab === 'requisitions' && <MyRequisitionsTab />}
        {activeTab === 'interviews' && <InterviewMgmtTab />}
        {activeTab === 'candidates' && <CandidateReviewTab />}
        {activeTab === 'reports' && <TeamHiringReportsTab />}
        {activeTab === 'referrals' && <ReferralMgmtTab />}
        {activeTab === 'offers' && <OfferApprovalTab />}
      </div>
    </div>
  );
}
