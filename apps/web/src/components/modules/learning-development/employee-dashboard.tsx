'use client';

import { useState } from 'react';
import {
  BookOpen,
  Route,
  Award,
  Wallet,
} from 'lucide-react';
import CourseCatalogTab from './tabs/employee/course-catalog-tab';
import MyLearningPathTab from './tabs/employee/my-learning-path-tab';
import CertificationTrackerTab from './tabs/employee/certification-tracker-tab';
import LearningBudgetTab from './tabs/employee/learning-budget-tab';

const TABS = [
  { id: 'course-catalog', label: 'Course Catalog', icon: BookOpen },
  { id: 'my-learning-path', label: 'My Learning Path', icon: Route },
  { id: 'certification-tracker', label: 'Certification Tracker', icon: Award },
  { id: 'learning-budget', label: 'Learning Budget', icon: Wallet },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('course-catalog');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Learning & Development</h1>

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
        {activeTab === 'course-catalog' && <CourseCatalogTab />}
        {activeTab === 'my-learning-path' && <MyLearningPathTab />}
        {activeTab === 'certification-tracker' && <CertificationTrackerTab />}
        {activeTab === 'learning-budget' && <LearningBudgetTab />}
      </div>
    </div>
  );
}
