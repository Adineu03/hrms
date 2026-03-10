'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AiResult {
  insights?: string[];
  suggestions?: string[];
  alerts?: string[];
  recommendations?: string[];
  teamHealthScore?: number;
  trends?: string[];
  inefficiencies?: string[];
  restructuringOptions?: string[];
  expectedImpact?: string;
  equityScore?: number;
  riskEmployees?: string[];
  marketComparisons?: string[];
  readinessScore?: number;
  keyRoles?: string[];
  successorCandidates?: string[];
  developmentGaps?: string[];
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
    key: 'team-insights-brief',
    label: 'Team Insights Brief',
    description: 'Comprehensive AI-powered brief on team health, trends, and performance',
    endpoint: '/core-hr/ai/team-insights-brief',
  },
  {
    key: 'org-design-suggestions',
    label: 'Org Design Suggestions',
    description: 'AI suggestions for improving your team and org structure',
    endpoint: '/core-hr/ai/org-design-suggestions',
  },
  {
    key: 'comp-equity-alerts',
    label: 'Comp Equity Alerts',
    description: 'Identify pay equity gaps and market alignment issues within your team',
    endpoint: '/core-hr/ai/comp-equity-alerts',
  },
  {
    key: 'succession-readiness',
    label: 'Succession Readiness',
    description: 'Assess team succession readiness and identify development gaps',
    endpoint: '/core-hr/ai/succession-readiness',
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
  if (result.insights?.length) allItems.push({ label: 'Insights', items: result.insights });
  if (result.trends?.length) allItems.push({ label: 'Trends', items: result.trends });
  if (result.alerts?.length) allItems.push({ label: 'Alerts', items: result.alerts });
  if (result.recommendations?.length) allItems.push({ label: 'Recommendations', items: result.recommendations });
  if (result.suggestions?.length) allItems.push({ label: 'Suggestions', items: result.suggestions });
  if (result.inefficiencies?.length) allItems.push({ label: 'Inefficiencies', items: result.inefficiencies });
  if (result.restructuringOptions?.length) allItems.push({ label: 'Restructuring Options', items: result.restructuringOptions });
  if (result.riskEmployees?.length) allItems.push({ label: 'At-Risk Employees', items: result.riskEmployees });
  if (result.successorCandidates?.length) allItems.push({ label: 'Successor Candidates', items: result.successorCandidates });
  if (result.developmentGaps?.length) allItems.push({ label: 'Development Gaps', items: result.developmentGaps });
  if (result.keyRoles?.length) allItems.push({ label: 'Key Roles', items: result.keyRoles });

  const visibleItems = expanded ? allItems : allItems.slice(0, 2);

  return (
    <div className="mt-3 space-y-2">
      {result.teamHealthScore !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Team Health Score:</span>
          <span className="text-xs font-semibold text-primary">{String(result.teamHealthScore)}%</span>
        </div>
      )}
      {result.equityScore !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Equity Score:</span>
          <span className="text-xs font-semibold text-primary">{String(result.equityScore)}%</span>
        </div>
      )}
      {result.readinessScore !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Readiness Score:</span>
          <span className="text-xs font-semibold text-primary">{String(result.readinessScore)}%</span>
        </div>
      )}
      {result.expectedImpact && (
        <div>
          <p className="text-xs text-text-muted mb-0.5">Expected Impact</p>
          <p className="text-xs text-text">{String(result.expectedImpact)}</p>
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
        AI-driven tools to help you understand your team, plan for succession, and ensure fair compensation.
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
