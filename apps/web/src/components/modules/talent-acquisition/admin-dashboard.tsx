'use client';

import { useState } from 'react';
import {
  FileText,
  Megaphone,
  GitBranch,
  Database,
  BarChart3,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import JobRequisitionTab from './tabs/admin/job-requisition-tab';
import JobPostingTab from './tabs/admin/job-posting-tab';
import PipelineConfigTab from './tabs/admin/pipeline-config-tab';
import CandidateDatabaseTab from './tabs/admin/candidate-database-tab';
import RecruitmentReportsTab from './tabs/admin/recruitment-reports-tab';
import OfferManagementTab from './tabs/admin/offer-management-tab';
import AiInsightsTab from './tabs/admin/ai-insights-tab';

const TABS = [
  { id: 'requisitions', label: 'Job Requisitions', icon: FileText },
  { id: 'postings', label: 'Job Postings', icon: Megaphone },
  { id: 'pipeline', label: 'Pipeline Config', icon: GitBranch },
  { id: 'candidates', label: 'Candidate Database', icon: Database },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'offers', label: 'Offer Management', icon: FileCheck },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('requisitions');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Talent Acquisition Administration</h1>

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
        {activeTab === 'requisitions' && <JobRequisitionTab />}
        {activeTab === 'postings' && <JobPostingTab />}
        {activeTab === 'pipeline' && <PipelineConfigTab />}
        {activeTab === 'candidates' && <CandidateDatabaseTab />}
        {activeTab === 'reports' && <RecruitmentReportsTab />}
        {activeTab === 'offers' && <OfferManagementTab />}
        {activeTab === 'ai-insights' && <AiInsightsTab />}
      </div>
    </div>
  );
}
