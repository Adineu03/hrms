'use client';

import { useState } from 'react';
import {
  Rocket,
  Upload,
  GraduationCap,
  DoorOpen,
  ArrowLeftRight,
  HeartHandshake,
} from 'lucide-react';
import MyOnboardingTab from './tabs/employee/my-onboarding-tab';
import DocumentSubmissionTab from './tabs/employee/document-submission-tab';
import OrientationTrainingTab from './tabs/employee/orientation-training-tab';
import MyExitProcessTab from './tabs/employee/my-exit-process-tab';
import HandoverMgmtTab from './tabs/employee/handover-mgmt-tab';
import PostJoiningTab from './tabs/employee/post-joining-tab';

const TABS = [
  { id: 'my-onboarding', label: 'My Onboarding', icon: Rocket },
  { id: 'documents', label: 'Document Submission', icon: Upload },
  { id: 'orientation', label: 'Orientation & Training', icon: GraduationCap },
  { id: 'exit-process', label: 'My Exit Process', icon: DoorOpen },
  { id: 'handover', label: 'Handover Management', icon: ArrowLeftRight },
  { id: 'post-joining', label: 'Post-Joining Support', icon: HeartHandshake },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('my-onboarding');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Onboarding & Offboarding — Employee View</h1>

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
        {activeTab === 'my-onboarding' && <MyOnboardingTab />}
        {activeTab === 'documents' && <DocumentSubmissionTab />}
        {activeTab === 'orientation' && <OrientationTrainingTab />}
        {activeTab === 'exit-process' && <MyExitProcessTab />}
        {activeTab === 'handover' && <HandoverMgmtTab />}
        {activeTab === 'post-joining' && <PostJoiningTab />}
      </div>
    </div>
  );
}
