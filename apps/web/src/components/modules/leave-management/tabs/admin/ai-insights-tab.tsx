'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AiResult {
  insights?: string[];
  suggestions?: string[];
  alerts?: string[];
  recommendations?: string[];
  benchmarkFindings?: string[];
  gaps?: string[];
  industryComparisons?: string[];
  suspiciousPatterns?: string[];
  flaggedCases?: string[];
  riskLevel?: string;
  liabilityProjections?: string[];
  totalLiability?: string;
  highRiskEmployees?: string[];
  regulatoryUpdates?: string[];
  complianceGaps?: string[];
  requiredActions?: string[];
  deadlines?: string[];
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
    key: 'policy-benchmarking',
    label: 'Policy Benchmarking',
    description: 'Compare your leave policies against industry standards and best practices',
    endpoint: '/leave-management/ai/policy-benchmarking',
  },
  {
    key: 'abuse-detection',
    label: 'Abuse Detection',
    description: 'Identify potential leave policy misuse and suspicious patterns',
    endpoint: '/leave-management/ai/abuse-detection',
  },
  {
    key: 'liability-forecast',
    label: 'Liability Forecast',
    description: 'Project future leave liability costs and encashment obligations',
    endpoint: '/leave-management/ai/liability-forecast',
  },
  {
    key: 'regulatory-auto-update',
    label: 'Regulatory Auto-Update',
    description: 'Monitor regulatory changes and get automatic policy update suggestions',
    endpoint: '/leave-management/ai/regulatory-auto-update',
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
  if (result.benchmarkFindings?.length) allItems.push({ label: 'Benchmark Findings', items: result.benchmarkFindings });
  if (result.gaps?.length) allItems.push({ label: 'Policy Gaps', items: result.gaps });
  if (result.industryComparisons?.length) allItems.push({ label: 'Industry Comparisons', items: result.industryComparisons });
  if (result.suspiciousPatterns?.length) allItems.push({ label: 'Suspicious Patterns', items: result.suspiciousPatterns });
  if (result.flaggedCases?.length) allItems.push({ label: 'Flagged Cases', items: result.flaggedCases });
  if (result.liabilityProjections?.length) allItems.push({ label: 'Liability Projections', items: result.liabilityProjections });
  if (result.highRiskEmployees?.length) allItems.push({ label: 'High Risk Employees', items: result.highRiskEmployees });
  if (result.regulatoryUpdates?.length) allItems.push({ label: 'Regulatory Updates', items: result.regulatoryUpdates });
  if (result.complianceGaps?.length) allItems.push({ label: 'Compliance Gaps', items: result.complianceGaps });
  if (result.requiredActions?.length) allItems.push({ label: 'Required Actions', items: result.requiredActions });
  if (result.deadlines?.length) allItems.push({ label: 'Deadlines', items: result.deadlines });
  if (result.insights?.length) allItems.push({ label: 'Insights', items: result.insights });
  if (result.recommendations?.length) allItems.push({ label: 'Recommendations', items: result.recommendations });
  if (result.alerts?.length) allItems.push({ label: 'Alerts', items: result.alerts });

  const visibleItems = expanded ? allItems : allItems.slice(0, 2);

  return (
    <div className="mt-3 space-y-2">
      {result.riskLevel && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Risk Level:</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            result.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
            result.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>{String(result.riskLevel).charAt(0).toUpperCase() + String(result.riskLevel).slice(1)}</span>
        </div>
      )}
      {result.totalLiability && (
        <div className="p-2 bg-amber-50 rounded-lg">
          <p className="text-xs text-amber-700 font-medium">Total Liability: {String(result.totalLiability)}</p>
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
        AI tools for policy benchmarking, abuse detection, liability forecasting, and regulatory compliance.
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
