'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertTriangle, FileSearch, Shield, Wrench, Radio } from 'lucide-react';

interface AiResult {
  changes?: Array<{ regulation: string; summary: string; effectiveDate: string; impact: string }>;
  riskAreas?: Array<{ area: string; riskLevel: string; probability: string; impact: string }>;
  gaps?: Array<{ area: string; description: string; severity: string; remediation: string }>;
  suggestions?: Array<{ issue: string; action: string; priority: string; estimatedTime: string; automatable: boolean }>;
  urgentActions?: string[];
  recommendations?: string[];
  insights?: string[];
  summary?: string;
  riskScore?: number;
  gapCount?: number;
  confidence?: number;
  [key: string]: unknown;
}

const features = [
  {
    key: 'regulatory-change-monitor',
    label: 'Regulatory Change Monitor',
    desc: 'Track and analyze recent regulatory changes affecting your organization',
    endpoint: '/compliance-audit/ai/regulatory-change-monitor',
    icon: Radio,
  },
  {
    key: 'audit-risk-predictor',
    label: 'Audit Risk Predictor',
    desc: 'Predict areas most likely to face compliance issues in an audit',
    endpoint: '/compliance-audit/ai/audit-risk-predictor',
    icon: FileSearch,
  },
  {
    key: 'compliance-gap-analysis',
    label: 'Compliance Gap Analysis',
    desc: 'Identify gaps in compliance coverage and prioritize remediation',
    endpoint: '/compliance-audit/ai/compliance-gap-analysis',
    icon: Shield,
  },
  {
    key: 'auto-remediation-suggestions',
    label: 'Auto-Remediation Suggestions',
    desc: 'Get AI-generated remediation actions for compliance issues',
    endpoint: '/compliance-audit/ai/auto-remediation-suggestions',
    icon: Wrench,
  },
];

export default function AiInsightsTab() {
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
                {typeof results[key].riskScore === 'number' && (
                  <p className="text-xs text-gray-600">
                    Risk Score:{' '}
                    <span className={`font-medium ${(results[key].riskScore as number) > 70 ? 'text-red-500' : (results[key].riskScore as number) > 40 ? 'text-amber-500' : 'text-green-500'}`}>
                      {results[key].riskScore as number}/100
                    </span>
                  </p>
                )}
                {typeof results[key].gapCount === 'number' && (
                  <p className="text-xs text-amber-600 font-medium">
                    {results[key].gapCount as number} compliance gap(s) identified
                  </p>
                )}
                {Array.isArray(results[key].changes) &&
                  (results[key].changes as Array<{ regulation: string; summary: string; impact: string }>)
                    .slice(0, 3)
                    .map((c, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-[#4F46E5] mt-0.5 flex-shrink-0">•</span>
                        <span><span className="font-medium">{c.regulation}</span>: {c.summary}</span>
                      </p>
                    ))}
                {Array.isArray(results[key].riskAreas) &&
                  (results[key].riskAreas as Array<{ area: string; riskLevel: string; probability: string }>)
                    .slice(0, 3)
                    .map((r, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className={`mt-0.5 flex-shrink-0 ${r.riskLevel === 'high' ? 'text-red-500' : r.riskLevel === 'medium' ? 'text-amber-500' : 'text-blue-500'}`}>⚠</span>
                        {r.area} — {r.riskLevel} risk ({r.probability})
                      </p>
                    ))}
                {Array.isArray(results[key].gaps) &&
                  (results[key].gaps as Array<{ area: string; description: string; severity: string }>)
                    .slice(0, 3)
                    .map((g, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className={`mt-0.5 flex-shrink-0 ${g.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`}>!</span>
                        {g.area}: {g.description}
                      </p>
                    ))}
                {Array.isArray(results[key].suggestions) &&
                  (results[key].suggestions as Array<{ issue: string; action: string; priority: string }>)
                    .slice(0, 3)
                    .map((s, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">→</span>
                        {s.action}
                      </p>
                    ))}
                {Array.isArray(results[key].urgentActions) &&
                  (results[key].urgentActions as string[]).slice(0, 2).map((a, i) => (
                    <p key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                      <span className="mt-0.5 flex-shrink-0">!</span>
                      {a}
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
