'use client';

import { useState } from 'react';
import { Receipt, Search, BookOpen } from 'lucide-react';
import MyExpensesTab from './tabs/employee/my-expenses-tab';
import ExpenseTrackingTab from './tabs/employee/expense-tracking-tab';
import ExpensePoliciesViewTab from './tabs/employee/expense-policies-view-tab';

const TABS = [
  { id: 'my-expenses', label: 'My Expenses', icon: Receipt },
  { id: 'tracking', label: 'Expense Tracking', icon: Search },
  { id: 'policies', label: 'Expense Policies', icon: BookOpen },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('my-expenses');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Expense Management</h1>
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
        {activeTab === 'my-expenses' && <MyExpensesTab />}
        {activeTab === 'tracking' && <ExpenseTrackingTab />}
        {activeTab === 'policies' && <ExpensePoliciesViewTab />}
      </div>
    </div>
  );
}
