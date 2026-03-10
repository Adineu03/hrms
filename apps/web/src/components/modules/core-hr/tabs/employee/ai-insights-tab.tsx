'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AiResult {
  insights?: string[];
  suggestions?: string[];
  alerts?: string[];
  profileCompleteness?: number;
  nextSteps?: string[];
  recommendedBenefits?: string[];
  savingsOpportunity?: string;
  utilizationGaps?: string[];
  foundDocuments?: string[];
  missingDocuments?: string[];
  expiringDocuments?: string[];
  taxSavingOpportunities?: string[];
  estimatedSavings?: string;
  declarations?: string[];
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
    key: 'profile-assistant',
    label: 'AI Profile Assistant',
    description: 'Get personalized suggestions to complete and improve your employee profile',
    endpoint: '/core-hr/ai/profile-assistant',
  },
  {
    key: 'benefits-recommender',
    label: 'Benefits Recommender',
    description: 'Discover the best benefits for your needs and identify underutilized perks',
    endpoint: '/core-hr/ai/benefits-recommender',
  },
  {
    key: 'smart-document-search',
    label: 'Smart Document Search',
    description: 'Intelligently find, organize, and track the status of your HR documents',
    endpoint: '/core-hr/ai/smart-document-search',
  },
  {
    key: 'tax-optimization-hints',
    label: 'Tax Optimization Hints',
    description: 'Discover tax-saving opportunities and optimize your declarations',
    endpoint: '/core-hr/ai/tax-optimization-hints',
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
  if (result.nextSteps?.length) allItems.push({ label: 'Next Steps', items: result.nextSteps });
  if (result.suggestions?.length) allItems.push({ label: 'Suggestions', items: result.suggestions });
  if (result.alerts?.length) allItems.push({ label: 'Alerts', items: result.alerts });
  if (result.recommendedBenefits?.length) allItems.push({ label: 'Recommended Benefits', items: result.recommendedBenefits });
  if (result.utilizationGaps?.length) allItems.push({ label: 'Utilization Gaps', items: result.utilizationGaps });
  if (result.foundDocuments?.length) allItems.push({ label: 'Found Documents', items: result.foundDocuments });
  if (result.missingDocuments?.length) allItems.push({ label: 'Missing Documents', items: result.missingDocuments });
  if (result.expiringDocuments?.length) allItems.push({ label: 'Expiring Soon', items: result.expiringDocuments });
  if (result.taxSavingOpportunities?.length) allItems.push({ label: 'Tax-Saving Opportunities', items: result.taxSavingOpportunities });
  if (result.declarations?.length) allItems.push({ label: 'Declarations to Review', items: result.declarations });

  const visibleItems = expanded ? allItems : allItems.slice(0, 2);

  return (
    <div className="mt-3 space-y-2">
      {result.profileCompleteness !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Profile Completeness:</span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${result.profileCompleteness}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-primary">{String(result.profileCompleteness)}%</span>
          </div>
        </div>
      )}
      {result.savingsOpportunity && (
        <div className="p-2 bg-green-50 rounded-lg">
          <p className="text-xs text-green-700 font-medium">Savings Opportunity: {String(result.savingsOpportunity)}</p>
        </div>
      )}
      {result.estimatedSavings && (
        <div className="p-2 bg-green-50 rounded-lg">
          <p className="text-xs text-green-700 font-medium">Estimated Savings: {String(result.estimatedSavings)}</p>
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
        Personalized AI tools to help you optimize your profile, benefits, documents, and tax savings.
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
