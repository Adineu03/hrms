'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertTriangle, Camera, Tag, Shield } from 'lucide-react';

interface AiResult {
  extractedData?: { merchant?: string; amount?: string; date?: string; category?: string };
  suggestions?: Array<{ expenseDesc: string; suggestedCategory: string; confidence: number } | string>;
  violations?: Array<{ description: string; policy: string; severity: string }>;
  insights?: string[];
  recommendations?: string[];
  summary?: string;
  complianceScore?: number;
  confidence?: number;
  [key: string]: unknown;
}

const features = [
  {
    key: 'smart-receipt-scanner',
    label: 'Smart Receipt Scanner',
    desc: 'AI-powered OCR to extract data from your receipts automatically',
    endpoint: '/expense-management/ai/smart-receipt-scanner',
    icon: Camera,
  },
  {
    key: 'expense-categorization',
    label: 'Expense Categorization',
    desc: 'Get AI suggestions for categorizing your expenses correctly',
    endpoint: '/expense-management/ai/expense-categorization',
    icon: Tag,
  },
  {
    key: 'policy-compliance-checker',
    label: 'Policy Compliance Checker',
    desc: 'Check if your expense submissions comply with company policies',
    endpoint: '/expense-management/ai/policy-compliance-checker',
    icon: Shield,
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
                {results[key].extractedData && (
                  <div className="space-y-1">
                    {Object.entries(results[key].extractedData as Record<string, string>).map(([k, v]) => (
                      <p key={k} className="text-xs text-gray-600 flex gap-1.5">
                        <span className="font-medium capitalize">{k}:</span>
                        <span>{v}</span>
                      </p>
                    ))}
                  </div>
                )}
                {typeof results[key].complianceScore === 'number' && (
                  <p className="text-xs text-gray-600">
                    Compliance Score:{' '}
                    <span className={`font-medium ${(results[key].complianceScore as number) >= 80 ? 'text-green-500' : (results[key].complianceScore as number) >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {results[key].complianceScore as number}%
                    </span>
                  </p>
                )}
                {Array.isArray(results[key].violations) &&
                  (results[key].violations as Array<{ description: string; policy: string; severity: string }>)
                    .slice(0, 3)
                    .map((v, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className={`mt-0.5 flex-shrink-0 ${v.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`}>⚠</span>
                        {v.description}
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
