'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AiResult {
  insights?: string[];
  suggestions?: string[];
  alerts?: string[];
  tips?: string[];
  recommendations?: string[];
  suggestedLeaveDates?: string[];
  holidays?: string[];
  planningTips?: string[];
  forecast?: string[];
  projectedBalances?: string[];
  suggestedLeaveType?: string;
  bestDates?: string[];
  approvalLikelihood?: string;
  wellnessScore?: number;
  nudges?: string[];
  burnoutIndicators?: string[];
  error?: string;
  [key: string]: unknown;
}

interface Feature {
  key: string;
  label: string;
  description: string;
  endpoint: string;
}

const FEATURES: Feature[] = [
  {
    key: 'smart-leave-planner',
    label: 'Smart Leave Planner',
    description: 'AI-optimized leave planning suggestions aligned with holidays and workload',
    endpoint: '/leave-management/ai/smart-leave-planner',
  },
  {
    key: 'balance-forecast',
    label: 'Balance Forecast',
    description: 'Predict how your leave balances will evolve over the coming months',
    endpoint: '/leave-management/ai/balance-forecast',
  },
  {
    key: 'conversational-apply',
    label: 'Conversational Apply',
    description: 'AI-guided leave application with smart suggestions for type and dates',
    endpoint: '/leave-management/ai/conversational-apply',
  },
  {
    key: 'wellness-nudge',
    label: 'Wellness Nudge',
    description: 'Get personalized wellness insights and reminders to maintain work-life balance',
    endpoint: '/leave-management/ai/wellness-nudge',
  },
];

function ResultCard({ result }: { result: AiResult }) {
  const [expanded, setExpanded] = useState(false);

  if (result.error) {
    return (
      <div className="mt-3 p-3 bg-red-50 rounded-lg flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
        <p className="text-sm text-red-600">{result.error}</p>
      </div>
    );
  }

  const allItems: { label: string; items: string[] }[] = [];
  if (result.suggestedLeaveDates?.length) allItems.push({ label: 'Suggested Leave Dates', items: result.suggestedLeaveDates });
  if (result.holidays?.length) allItems.push({ label: 'Upcoming Holidays', items: result.holidays });
  if (result.planningTips?.length) allItems.push({ label: 'Planning Tips', items: result.planningTips });
  if (result.forecast?.length) allItems.push({ label: 'Balance Forecast', items: result.forecast });
  if (result.projectedBalances?.length) allItems.push({ label: 'Projected Balances', items: result.projectedBalances });
  if (result.bestDates?.length) allItems.push({ label: 'Best Dates for Leave', items: result.bestDates });
  if (result.nudges?.length) allItems.push({ label: 'Wellness Nudges', items: result.nudges });
  if (result.burnoutIndicators?.length) allItems.push({ label: 'Burnout Indicators', items: result.burnoutIndicators });
  if (result.insights?.length) allItems.push({ label: 'Insights', items: result.insights });
  if (result.recommendations?.length) allItems.push({ label: 'Recommendations', items: result.recommendations });
  if (result.suggestions?.length) allItems.push({ label: 'Suggestions', items: result.suggestions });
  if (result.tips?.length) allItems.push({ label: 'Tips', items: result.tips });
  if (result.alerts?.length) allItems.push({ label: 'Alerts', items: result.alerts });

  const visibleItems = expanded ? allItems : allItems.slice(0, 2);

  return (
    <div className="mt-3 space-y-2">
      {result.wellnessScore !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Wellness Score:</span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  Number(result.wellnessScore) > 70 ? 'bg-green-500' :
                  Number(result.wellnessScore) > 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${result.wellnessScore}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-primary">{String(result.wellnessScore)}%</span>
          </div>
        </div>
      )}
      {result.suggestedLeaveType && (
        <div className="p-2 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 font-medium">Suggested Leave Type: {String(result.suggestedLeaveType)}</p>
        </div>
      )}
      {result.approvalLikelihood && (
        <div className="p-2 bg-green-50 rounded-lg">
          <p className="text-xs text-green-700 font-medium">Approval Likelihood: {String(result.approvalLikelihood)}</p>
        </div>
      )}
      {visibleItems.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-medium text-text-muted mb-1">{group.label}</p>
          <ul className="space-y-1">
            {group.items.slice(0, 3).map((item, i) => (
              <li key={i} className="text-xs text-text flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {allItems.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary flex items-center gap-1 hover:underline"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Show less' : `Show ${allItems.length - 2} more sections`}
        </button>
      )}
    </div>
  );
}

export default function AiInsightsTab() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AiResult>>({});

  const runAnalysis = async (feature: Feature) => {
    setLoading(feature.key);
    try {
      const res = await api.post(feature.endpoint, {});
      const data = (res.data as { data: { result: AiResult } }).data;
      setResults((prev) => ({ ...prev, [feature.key]: data.result }));
    } catch {
      setResults((prev) => ({
        ...prev,
        [feature.key]: { error: 'Analysis failed. Please try again.' },
      }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">AI Insights</h2>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
          Powered by AI
        </span>
      </div>

      <p className="text-sm text-text-muted">
        AI-powered tools to plan your leaves smarter, forecast balances, simplify applications, and maintain wellness.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FEATURES.map((feature) => (
          <div key={feature.key} className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-text">{feature.label}</h3>
                <p className="text-sm text-text-muted mt-0.5">{feature.description}</p>
              </div>
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            </div>
            <button
              onClick={() => runAnalysis(feature)}
              disabled={loading === feature.key}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading === feature.key ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading === feature.key ? 'Analyzing...' : 'Run Analysis'}
            </button>
            {results[feature.key] && <ResultCard result={results[feature.key]} />}
          </div>
        ))}
      </div>
    </div>
  );
}
