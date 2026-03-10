'use client';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, X, Star } from 'lucide-react';
import { api } from '@/lib/api';

interface SuccessionCandidate {
  id: string;
  candidateEmployeeId: string;
  readinessLevel: string;
  flightRisk: string;
}

interface TeamSuccessionPlan {
  id: string;
  positionTitle: string;
  criticalityLevel: string;
  benchStrength: string;
  coveragePercent: number;
  candidates?: SuccessionCandidate[];
}

interface BenchStrengthSummary {
  strong: number;
  adequate: number;
  weak: number;
  none: number;
}

const criticalityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
};

const benchStrengthColors: Record<string, string> = {
  strong: 'bg-green-100 text-green-700',
  adequate: 'bg-blue-100 text-blue-700',
  weak: 'bg-orange-100 text-orange-700',
  none: 'bg-red-100 text-red-700',
};

const readinessColors: Record<string, string> = {
  ready_now: 'bg-green-100 text-green-700',
  '1yr': 'bg-yellow-100 text-yellow-700',
  '2yr': 'bg-orange-100 text-orange-700',
};

const readinessLabels: Record<string, string> = {
  ready_now: 'Ready Now',
  '1yr': '1 Year',
  '2yr': '2 Years',
};

export default function TeamSuccessionDashboardTab() {
  const [plans, setPlans] = useState<TeamSuccessionPlan[]>([]);
  const [benchSummary, setBenchSummary] = useState<BenchStrengthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, benchRes] = await Promise.allSettled([
        api.get('/workforce-planning/manager/team-succession'),
        api.get('/workforce-planning/manager/team-succession/bench-strength'),
      ]);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data?.data || plansRes.value.data || []);
      if (benchRes.status === 'fulfilled') setBenchSummary(benchRes.value.data?.data || benchRes.value.data || null);
    } catch {
      setError('Failed to load team succession data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading succession dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {benchSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Strong Bench', value: benchSummary.strong, color: 'text-green-600' },
            { label: 'Adequate Bench', value: benchSummary.adequate, color: 'text-blue-600' },
            { label: 'Weak Bench', value: benchSummary.weak, color: 'text-orange-600' },
            { label: 'No Bench', value: benchSummary.none, color: 'text-red-600' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-4">Team Succession Plans</h2>
        {plans.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No succession plans found for your team.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <span className="font-medium text-[#2c2c2c] text-sm">{plan.positionTitle}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${criticalityColors[plan.criticalityLevel] || 'bg-gray-100 text-gray-700'}`}>
                      {plan.criticalityLevel}
                    </span>
                    {plan.benchStrength && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${benchStrengthColors[plan.benchStrength] || 'bg-gray-100 text-gray-700'}`}>
                        {plan.benchStrength}
                      </span>
                    )}
                    {plan.coveragePercent != null && (
                      <span className="text-xs text-gray-500">{plan.coveragePercent}% coverage</span>
                    )}
                  </div>
                </div>

                {plan.candidates && plan.candidates.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Candidates ({plan.candidates.length})</p>
                    {plan.candidates.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded p-2">
                        <span className="font-mono font-medium text-[#2c2c2c]">{c.candidateEmployeeId}</span>
                        <span className={`px-1.5 py-0.5 rounded-full font-medium ${readinessColors[c.readinessLevel] || 'bg-gray-100 text-gray-700'}`}>
                          {readinessLabels[c.readinessLevel] || c.readinessLevel}
                        </span>
                        <span className={`font-medium ${c.flightRisk === 'high' ? 'text-red-600' : c.flightRisk === 'medium' ? 'text-orange-500' : 'text-green-600'}`}>
                          {c.flightRisk} risk
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No candidates assigned</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
