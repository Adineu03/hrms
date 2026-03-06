'use client';

import { useState } from 'react';
import {
  Target,
  FileEdit,
  MessageCircle,
  ClipboardCheck,
  TrendingUp,
  Rocket,
} from 'lucide-react';
import MyGoalsTab from './tabs/employee/my-goals-tab';
import SelfReviewTab from './tabs/employee/self-review-tab';
import FeedbackTab from './tabs/employee/feedback-tab';
import MyReviewsTab from './tabs/employee/my-reviews-tab';
import DevelopmentPlanTab from './tabs/employee/development-plan-tab';
import CareerGrowthTab from './tabs/employee/career-growth-tab';

const TABS = [
  { id: 'my-goals', label: 'My Goals', icon: Target },
  { id: 'self-review', label: 'Self-Review', icon: FileEdit },
  { id: 'feedback', label: 'Feedback', icon: MessageCircle },
  { id: 'my-reviews', label: 'My Reviews', icon: ClipboardCheck },
  { id: 'development', label: 'Development Plan', icon: TrendingUp },
  { id: 'career', label: 'Career Growth', icon: Rocket },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('my-goals');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Performance & Growth</h1>

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
        {activeTab === 'my-goals' && <MyGoalsTab />}
        {activeTab === 'self-review' && <SelfReviewTab />}
        {activeTab === 'feedback' && <FeedbackTab />}
        {activeTab === 'my-reviews' && <MyReviewsTab />}
        {activeTab === 'development' && <DevelopmentPlanTab />}
        {activeTab === 'career' && <CareerGrowthTab />}
      </div>
    </div>
  );
}
