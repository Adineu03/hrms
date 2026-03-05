'use client';

import { useState } from 'react';
import {
  Building2,
  MapPin,
  Network,
  Briefcase,
  BarChart3,
  Users,
  Shield,
  Upload,
} from 'lucide-react';
import OrganizationTab from './tabs/organization-tab';
import LocationsTab from './tabs/locations-tab';
import DepartmentsTab from './tabs/departments-tab';
import DesignationsTab from './tabs/designations-tab';
import GradesTab from './tabs/grades-tab';
import UsersTab from './tabs/users-tab';
import PoliciesTab from './tabs/policies-tab';
import ImportTab from './tabs/import-tab';

const TABS = [
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'departments', label: 'Departments', icon: Network },
  { id: 'designations', label: 'Designations', icon: Briefcase },
  { id: 'grades', label: 'Grades', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'policies', label: 'Policies', icon: Shield },
  { id: 'import', label: 'Import', icon: Upload },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminSettingsDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('organization');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">
        Organization Settings
      </h1>

      {/* Tab Navigation */}
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

      {/* Tab Content */}
      <div className="bg-card rounded-xl border border-border p-6">
        {activeTab === 'organization' && <OrganizationTab />}
        {activeTab === 'locations' && <LocationsTab />}
        {activeTab === 'departments' && <DepartmentsTab />}
        {activeTab === 'designations' && <DesignationsTab />}
        {activeTab === 'grades' && <GradesTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'policies' && <PoliciesTab />}
        {activeTab === 'import' && <ImportTab />}
      </div>
    </div>
  );
}
