'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AiResult {
  insights?: string[];
  suggestions?: string[];
  alerts?: string[];
  recommendations?: string[];
  predictions?: string[];
  atRiskEmployees?: string[];
  riskFactors?: string[];
  confidence?: number;
  optimizations?: string[];
  shiftRecommendations?: string[];
  coverageGaps?: string[];
  healthScore?: number;
  burnoutRisks?: string[];
  trends?: string[];
  exceptions?: string[];
  suggestedResolutions?: string[];
  autoResolvable?: string[];
  requiresReview?: string[];
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
    key: 'absenteeism-predictor',
    label: 'Absenteeism Predictor',
    description: 'Forecast potential absenteeism before it happens and take proactive action',
    endpoint: '/attendance/ai/absenteeism-predictor',
  },
  {
    key: 'smart-shift-optimizer',
    label: 'Smart Shift Optimizer',
    description: 'AI-optimized shift assignments based on employee patterns and coverage needs',
    endpoint: '/attendance/ai/smart-shift-optimizer',
  },
  {
    key: 'team-health-pulse',
    label: 'Team Health Pulse',
    description: 'Assess team attendance health, burnout risks, and productivity trends',
    endpoint: '/attendance/ai/team-health-pulse',
  },
  {
    key: 'auto-exception-resolution',
    label: 'Auto-Exception Resolution',
    description: 'Automatically identify and suggest resolutions for attendance exceptions',
    endpoint: '/attendance/ai/auto-exception-resolution',
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
  if (result.predictions?.length) allItems.push({ label: 'Predictions', items: result.predictions });
  if (result.atRiskEmployees?.length) allItems.push({ label: 'At-Risk Employees', items: result.atRiskEmployees });
  if (result.riskFactors?.length) allItems.push({ label: 'Risk Factors', items: result.riskFactors });
  if (result.optimizations?.length) allItems.push({ label: 'Optimizations', items: result.optimizations });
  if (result.shiftRecommendations?.length) allItems.push({ label: 'Shift Recommendations', items: result.shiftRecommendations });
  if (result.coverageGaps?.length) allItems.push({ label: 'Coverage Gaps', items: result.coverageGaps });
  if (result.burnoutRisks?.length) allItems.push({ label: 'Burnout Risks', items: result.burnoutRisks });
  if (result.trends?.length) allItems.push({ label: 'Trends', items: result.trends });
  if (result.exceptions?.length) allItems.push({ label: 'Exceptions', items: result.exceptions });
  if (result.suggestedResolutions?.length) allItems.push({ label: 'Suggested Resolutions', items: result.suggestedResolutions });
  if (result.requiresReview?.length) allItems.push({ label: 'Requires Review', items: result.requiresReview });
  if (result.insights?.length) allItems.push({ label: 'Insights', items: result.insights });
  if (result.recommendations?.length) allItems.push({ label: 'Recommendations', items: result.recommendations });
  if (result.alerts?.length) allItems.push({ label: 'Alerts', items: result.alerts });

  const visibleItems = expanded ? allItems : allItems.slice(0, 2);

  return (
    <div className="mt-3 space-y-2">
      {result.healthScore !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Health Score:</span>
          <span className="text-xs font-semibold text-primary">{String(result.healthScore)}%</span>
        </div>
      )}
      {result.confidence !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Prediction Confidence:</span>
          <span className="text-xs font-semibold text-primary">{Math.round(Number(result.confidence) * 100)}%</span>
        </div>
      )}
      {result.autoResolvable?.length ? (
        <div className="p-2 bg-green-50 rounded-lg">
          <p className="text-xs text-green-700 font-medium">{result.autoResolvable.length} exception(s) can be auto-resolved</p>
        </div>
      ) : null}
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
        AI tools to predict absenteeism, optimize shifts, monitor team health, and resolve attendance exceptions automatically.
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
