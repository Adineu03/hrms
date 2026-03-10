'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AiResult {
  insights?: string[];
  suggestions?: string[];
  alerts?: string[];
  anomalies?: string[];
  recommendations?: string[];
  designRecommendations?: string[];
  parsedFields?: string[];
  complianceIssues?: string[];
  upcomingRisks?: string[];
  complianceScore?: number;
  riskLevel?: string;
  affectedEmployees?: string[];
  criticalDeadlines?: string[];
  redundancies?: string[];
  optimizations?: string[];
  spanOfControl?: string;
  expectedImpact?: string;
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
    key: 'org-designer',
    label: 'AI Org Designer',
    description: 'Strategic recommendations for org structure and hierarchy optimization',
    endpoint: '/core-hr/ai/org-designer',
  },
  {
    key: 'smart-document-parser',
    label: 'Smart Document Parser',
    description: 'Analyze HR documents for completeness, compliance, and anomalies',
    endpoint: '/core-hr/ai/smart-document-parser',
  },
  {
    key: 'payroll-anomaly-detection',
    label: 'Payroll Anomaly Detection',
    description: 'Detect unusual patterns and discrepancies in payroll data',
    endpoint: '/core-hr/ai/payroll-anomaly-detection',
  },
  {
    key: 'predictive-compliance',
    label: 'Predictive Compliance',
    description: 'Forecast compliance risks and upcoming regulatory deadlines',
    endpoint: '/core-hr/ai/predictive-compliance',
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
  if (result.designRecommendations?.length) allItems.push({ label: 'Design Recommendations', items: result.designRecommendations });
  if (result.anomalies?.length) allItems.push({ label: 'Anomalies Detected', items: result.anomalies });
  if (result.upcomingRisks?.length) allItems.push({ label: 'Upcoming Risks', items: result.upcomingRisks });
  if (result.complianceIssues?.length) allItems.push({ label: 'Compliance Issues', items: result.complianceIssues });
  if (result.insights?.length) allItems.push({ label: 'Insights', items: result.insights });
  if (result.recommendations?.length) allItems.push({ label: 'Recommendations', items: result.recommendations });
  if (result.alerts?.length) allItems.push({ label: 'Alerts', items: result.alerts });
  if (result.suggestions?.length) allItems.push({ label: 'Suggestions', items: result.suggestions });

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
      {result.complianceScore !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Compliance Score:</span>
          <span className="text-xs font-semibold text-primary">{String(result.complianceScore)}%</span>
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
        AI-powered tools to streamline organizational design, document management, and compliance monitoring.
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
