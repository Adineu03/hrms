'use client';

import { useState } from 'react';
import {
  RotateCcw,
  Target,
  BookOpen,
  BarChart3,
  Scale,
  AlertTriangle,
} from 'lucide-react';
import ReviewCycleTab from './tabs/admin/review-cycle-tab';
import GoalFrameworkTab from './tabs/admin/goal-framework-tab';
import CompetencyLibraryTab from './tabs/admin/competency-library-tab';
import PerformanceAnalyticsTab from './tabs/admin/performance-analytics-tab';
import CalibrationTab from './tabs/admin/calibration-tab';
import PipTab from './tabs/admin/pip-tab';

const TABS = [
  { id: 'review-cycles', label: 'Review Cycles', icon: RotateCcw },
  { id: 'goal-framework', label: 'Goal Framework', icon: Target },
  { id: 'competency-library', label: 'Competency Library', icon: BookOpen },
  { id: 'performance-analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'calibration', label: 'Calibration', icon: Scale },
  { id: 'pip', label: 'PIP Management', icon: AlertTriangle },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('review-cycles');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Performance & Growth Administration</h1>

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
        {activeTab === 'review-cycles' && <ReviewCycleTab />}
        {activeTab === 'goal-framework' && <GoalFrameworkTab />}
        {activeTab === 'competency-library' && <CompetencyLibraryTab />}
        {activeTab === 'performance-analytics' && <PerformanceAnalyticsTab />}
        {activeTab === 'calibration' && <CalibrationTab />}
        {activeTab === 'pip' && <PipTab />}
      </div>
    </div>
  );
}
