'use client';
import { useState } from 'react';
import MyAnalytics from './employee/my-analytics';
import PeerBenchmarks from './employee/peer-benchmarks';

const TABS = [
  { id: 'my-analytics', label: 'My Analytics' },
  { id: 'peer-benchmarks', label: 'Peer Benchmarks' },
];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('my-analytics');

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2c2c2c]">My Analytics</h1>
        <p className="text-gray-500 mt-1">Your personal HR stats and department benchmarks</p>
      </div>

      <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'my-analytics' && <MyAnalytics />}
        {activeTab === 'peer-benchmarks' && <PeerBenchmarks />}
      </div>
    </div>
  );
}
