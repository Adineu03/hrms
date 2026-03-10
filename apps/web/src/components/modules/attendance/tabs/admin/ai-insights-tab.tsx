'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AiResult {
  insights?: string[];
  suggestions?: string[];
  alerts?: string[];
  violations?: string[];
  recommendations?: string[];
  complianceScore?: number;
  criticalIssues?: string[];
  suspiciousPatterns?: string[];
  riskLevel?: string;
  flaggedEmployees?: string[];
  discrepancies?: string[];
  reconciliationStatus?: string;
  corrections?: string[];
  projectedImpact?: string;
  affectedEmployees?: string[];
  complianceChanges?: string[];
  risks?: string[];
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
    key: 'policy-impact-simulator',
    label: 'Policy Impact Simulator',
    description: 'Predict the impact of attendance policy changes before rolling them out',
    endpoint: '/attendance/ai/policy-impact-simulator',
  },
  {
    key: 'compliance-auto-monitor',
    label: 'Compliance Auto-Monitor',
    description: 'Automatically monitor attendance data for compliance violations',
    endpoint: '/attendance/ai/compliance-auto-monitor',
  },
  {
    key: 'fraud-detection',
    label: 'Fraud Detection',
    description: 'Identify suspicious attendance patterns and potential time fraud',
    endpoint: '/attendance/ai/fraud-detection',
  },
  {
    key: 'smart-payroll-reconciliation',
    label: 'Smart Payroll Reconciliation',
    description: 'Automatically reconcile attendance with payroll to catch discrepancies',
    endpoint: '/attendance/ai/smart-payroll-reconciliation',
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
  if (result.violations?.length) allItems.push({ label: 'Violations', items: result.violations });
  if (result.criticalIssues?.length) allItems.push({ label: 'Critical Issues', items: result.criticalIssues });
  if (result.suspiciousPatterns?.length) allItems.push({ label: 'Suspicious Patterns', items: result.suspiciousPatterns });
  if (result.flaggedEmployees?.length) allItems.push({ label: 'Flagged Employees', items: result.flaggedEmployees });
  if (result.discrepancies?.length) allItems.push({ label: 'Discrepancies', items: result.discrepancies });
  if (result.corrections?.length) allItems.push({ label: 'Corrections', items: result.corrections });
  if (result.complianceChanges?.length) allItems.push({ label: 'Compliance Changes', items: result.complianceChanges });
  if (result.risks?.length) allItems.push({ label: 'Risks', items: result.risks });
  if (result.insights?.length) allItems.push({ label: 'Insights', items: result.insights });
  if (result.recommendations?.length) allItems.push({ label: 'Recommendations', items: result.recommendations });
  if (result.alerts?.length) allItems.push({ label: 'Alerts', items: result.alerts });

  const visibleItems = expanded ? allItems : allItems.slice(0, 2);

  return (
    <div className="mt-3 space-y-2">
      {result.complianceScore !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Compliance Score:</span>
          <span className="text-xs font-semibold text-primary">{String(result.complianceScore)}%</span>
        </div>
      )}
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
      {result.reconciliationStatus && (
        <div className="p-2 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">Status: {String(result.reconciliationStatus)}</p>
        </div>
      )}
      {result.projectedImpact && (
        <div>
          <p className="text-xs text-text-muted mb-0.5">Projected Impact</p>
          <p className="text-xs text-text">{String(result.projectedImpact)}</p>
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
        AI-powered tools for policy simulation, compliance monitoring, fraud detection, and payroll reconciliation.
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
