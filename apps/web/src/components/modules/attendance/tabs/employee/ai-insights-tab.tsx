'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AiResult {
  insights?: string[];
  suggestions?: string[];
  alerts?: string[];
  reminders?: string[];
  optimalPunchTime?: string;
  missedPunches?: string[];
  commutePatterns?: string[];
  optimalArrivalTime?: string;
  patterns?: string[];
  productivityPeaks?: string[];
  recommendations?: string[];
  anomalies?: string[];
  riskFlags?: string[];
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
    key: 'smart-punch-reminder',
    label: 'Smart Punch Reminder',
    description: 'AI reminders based on your attendance patterns to avoid missed punches',
    endpoint: '/attendance/ai/smart-punch-reminder',
  },
  {
    key: 'commute-aware-clock-in',
    label: 'Commute-Aware Clock-In',
    description: 'Optimize your clock-in timing based on your commute patterns',
    endpoint: '/attendance/ai/commute-aware-clock-in',
  },
  {
    key: 'work-pattern-insights',
    label: 'Work Pattern Insights',
    description: 'Discover your peak productivity hours and work pattern trends',
    endpoint: '/attendance/ai/work-pattern-insights',
  },
  {
    key: 'anomaly-self-alert',
    label: 'Anomaly Self-Alert',
    description: 'Get alerted about unusual attendance patterns before they become issues',
    endpoint: '/attendance/ai/anomaly-self-alert',
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
  if (result.reminders?.length) allItems.push({ label: 'Reminders', items: result.reminders });
  if (result.missedPunches?.length) allItems.push({ label: 'Missed Punches', items: result.missedPunches });
  if (result.commutePatterns?.length) allItems.push({ label: 'Commute Patterns', items: result.commutePatterns });
  if (result.patterns?.length) allItems.push({ label: 'Work Patterns', items: result.patterns });
  if (result.productivityPeaks?.length) allItems.push({ label: 'Productivity Peaks', items: result.productivityPeaks });
  if (result.anomalies?.length) allItems.push({ label: 'Anomalies', items: result.anomalies });
  if (result.riskFlags?.length) allItems.push({ label: 'Risk Flags', items: result.riskFlags });
  if (result.insights?.length) allItems.push({ label: 'Insights', items: result.insights });
  if (result.recommendations?.length) allItems.push({ label: 'Recommendations', items: result.recommendations });
  if (result.suggestions?.length) allItems.push({ label: 'Suggestions', items: result.suggestions });
  if (result.alerts?.length) allItems.push({ label: 'Alerts', items: result.alerts });

  const visibleItems = expanded ? allItems : allItems.slice(0, 2);

  return (
    <div className="mt-3 space-y-2">
      {result.optimalPunchTime && (
        <div className="p-2 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 font-medium">Optimal Punch Time: {String(result.optimalPunchTime)}</p>
        </div>
      )}
      {result.optimalArrivalTime && (
        <div className="p-2 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 font-medium">Optimal Arrival: {String(result.optimalArrivalTime)}</p>
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
        AI-powered tools to optimize your attendance habits, commute timing, and work patterns.
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
