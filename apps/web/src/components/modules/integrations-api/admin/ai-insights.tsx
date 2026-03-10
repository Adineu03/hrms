'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertTriangle, Zap, BarChart2, AlertOctagon } from 'lucide-react';

interface AiResult {
  insights?: string[];
  optimizations?: Array<{ endpoint: string; issue: string; suggestion: string; impact: string }>;
  patterns?: Array<{ errorType: string; frequency: string; rootCause: string; fix: string }>;
  topIntegrations?: Array<{ name: string; health: string; usage: string }>;
  recommendations?: string[];
  summary?: string;
  potentialSavings?: string;
  criticalErrors?: number;
  confidence?: number;
  [key: string]: unknown;
}

const features = [
  {
    key: 'integration-intelligence',
    label: 'Integration Intelligence',
    desc: 'AI-powered analysis of integration health and usage patterns',
    endpoint: '/integrations-api/ai/integration-intelligence',
    icon: Zap,
  },
  {
    key: 'api-usage-optimizer',
    label: 'API Usage Optimizer',
    desc: 'Identify inefficiencies in API usage and optimize for performance',
    endpoint: '/integrations-api/ai/api-usage-optimizer',
    icon: BarChart2,
  },
  {
    key: 'error-pattern-analyzer',
    label: 'Error Pattern Analyzer',
    desc: 'Detect recurring error patterns and identify root causes',
    endpoint: '/integrations-api/ai/error-pattern-analyzer',
    icon: AlertOctagon,
  },
];

export default function AiInsights() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AiResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const runAnalysis = async (featureKey: string, endpoint: string) => {
    setLoading(featureKey);
    setErrors((prev) => {
      const n = { ...prev };
      delete n[featureKey];
      return n;
    });
    try {
      const res = await api.post(endpoint, {});
      setResults((prev) => ({ ...prev, [featureKey]: (res.data as { data: AiResult }).data }));
    } catch {
      setErrors((prev) => ({ ...prev, [featureKey]: 'Analysis failed. Please try again.' }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-5 w-5 text-[#4F46E5]" />
        <h2 className="text-lg font-semibold text-[#2c2c2c]">AI Insights</h2>
        <span className="text-xs bg-[#4F46E5]/10 text-[#4F46E5] px-2 py-0.5 rounded-full font-medium">
          Powered by AI
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map(({ key, label, desc, endpoint, icon: Icon }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <Icon className="h-4 w-4 text-[#4F46E5] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[#2c2c2c] text-sm">{label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
            <button
              onClick={() => runAnalysis(key, endpoint)}
              disabled={loading === key}
              className="w-full px-3 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-medium hover:bg-[#4338ca] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading === key ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {loading === key ? 'Analyzing...' : 'Run Analysis'}
            </button>
            {errors[key] && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                {errors[key]}
              </p>
            )}
            {results[key] && !errors[key] && (
              <div className="mt-4 p-3 bg-[#f5f5f0] rounded-lg space-y-1.5">
                {results[key].summary && (
                  <p className="text-sm text-[#2c2c2c]">{results[key].summary as string}</p>
                )}
                {results[key].potentialSavings && (
                  <p className="text-xs text-green-600 font-medium">
                    Potential savings: {results[key].potentialSavings as string}
                  </p>
                )}
                {typeof results[key].criticalErrors === 'number' && (results[key].criticalErrors as number) > 0 && (
                  <p className="text-xs text-red-600 font-medium">
                    {results[key].criticalErrors as number} critical error(s) detected
                  </p>
                )}
                {Array.isArray(results[key].topIntegrations) &&
                  (results[key].topIntegrations as Array<{ name: string; health: string; usage: string }>)
                    .slice(0, 3)
                    .map((t, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className={`mt-0.5 flex-shrink-0 ${t.health === 'good' ? 'text-green-500' : t.health === 'warning' ? 'text-amber-500' : 'text-red-500'}`}>•</span>
                        {t.name} — {t.health} ({t.usage})
                      </p>
                    ))}
                {Array.isArray(results[key].optimizations) &&
                  (results[key].optimizations as Array<{ endpoint: string; suggestion: string }>)
                    .slice(0, 3)
                    .map((o, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-[#4F46E5] mt-0.5 flex-shrink-0">•</span>
                        {o.endpoint}: {o.suggestion}
                      </p>
                    ))}
                {Array.isArray(results[key].patterns) &&
                  (results[key].patterns as Array<{ errorType: string; frequency: string; fix: string }>)
                    .slice(0, 3)
                    .map((p, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                        {p.errorType} ({p.frequency}): {p.fix}
                      </p>
                    ))}
                {Array.isArray(results[key].insights) &&
                  (results[key].insights as string[]).slice(0, 3).map((ins, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-[#4F46E5] mt-0.5 flex-shrink-0">•</span>
                      {ins}
                    </p>
                  ))}
                {Array.isArray(results[key].recommendations) &&
                  (results[key].recommendations as string[]).slice(0, 2).map((rec, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">→</span>
                      {rec}
                    </p>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
