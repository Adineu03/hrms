'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AiResult {
  insights?: string[];
  suggestions?: string[];
  alerts?: string[];
  recommendations?: string[];
  coverageRisks?: string[];
  criticalPeriods?: string[];
  riskScore?: number;
  patterns?: string[];
  flaggedEmployees?: string[];
  pendingApprovals?: string[];
  approvalRecommendations?: string[];
  riskFlags?: string[];
  quarterlyInsights?: string[];
  peakLeavePeriods?: string[];
  planningActions?: string[];
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
    key: 'coverage-risk-analyzer',
    label: 'Coverage Risk Analyzer',
    description: 'Assess and predict team coverage gaps during leave periods',
    endpoint: '/leave-management/ai/coverage-risk-analyzer',
  },
  {
    key: 'pattern-alerting',
    label: 'Pattern Alerting',
    description: 'Identify concerning leave patterns and potential issues in your team',
    endpoint: '/leave-management/ai/pattern-alerting',
  },
  {
    key: 'approval-copilot',
    label: 'Approval Copilot',
    description: 'AI assistance to make informed, fair leave approval decisions',
    endpoint: '/leave-management/ai/approval-copilot',
  },
  {
    key: 'quarterly-planning-brief',
    label: 'Quarterly Planning Brief',
    description: 'Comprehensive AI brief on team leave trends for the upcoming quarter',
    endpoint: '/leave-management/ai/quarterly-planning-brief',
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
  if (result.coverageRisks?.length) allItems.push({ label: 'Coverage Risks', items: result.coverageRisks });
  if (result.criticalPeriods?.length) allItems.push({ label: 'Critical Periods', items: result.criticalPeriods });
  if (result.patterns?.length) allItems.push({ label: 'Patterns Detected', items: result.patterns });
  if (result.flaggedEmployees?.length) allItems.push({ label: 'Flagged Employees', items: result.flaggedEmployees });
  if (result.pendingApprovals?.length) allItems.push({ label: 'Pending Approvals', items: result.pendingApprovals });
  if (result.approvalRecommendations?.length) allItems.push({ label: 'Approval Recommendations', items: result.approvalRecommendations });
  if (result.riskFlags?.length) allItems.push({ label: 'Risk Flags', items: result.riskFlags });
  if (result.quarterlyInsights?.length) allItems.push({ label: 'Quarterly Insights', items: result.quarterlyInsights });
  if (result.peakLeavePeriods?.length) allItems.push({ label: 'Peak Leave Periods', items: result.peakLeavePeriods });
  if (result.planningActions?.length) allItems.push({ label: 'Planning Actions', items: result.planningActions });
  if (result.insights?.length) allItems.push({ label: 'Insights', items: result.insights });
  if (result.recommendations?.length) allItems.push({ label: 'Recommendations', items: result.recommendations });
  if (result.alerts?.length) allItems.push({ label: 'Alerts', items: result.alerts });

  const visibleItems = expanded ? allItems : allItems.slice(0, 2);

  return (
    <div className="mt-3 space-y-2">
      {result.riskScore !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Coverage Risk Score:</span>
          <span className={`text-xs font-semibold ${
            Number(result.riskScore) > 70 ? 'text-red-600' :
            Number(result.riskScore) > 40 ? 'text-yellow-600' : 'text-green-600'
          }`}>{String(result.riskScore)}%</span>
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
        AI tools to analyze coverage risks, detect leave patterns, assist with approvals, and plan team leave for the quarter.
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
