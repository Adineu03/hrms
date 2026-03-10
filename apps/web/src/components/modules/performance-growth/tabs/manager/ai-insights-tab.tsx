'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, TrendingUp, AlertTriangle, MessageSquare, BarChart3 } from 'lucide-react';

interface AiResult {
  insights?: string[];
  suggestions?: string[];
  prediction?: string;
  confidence?: number;
  factors?: string[];
  recommendations?: string[];
  [key: string]: unknown;
}

const features = [
  {
    key: 'review-copilot',
    label: 'Review Copilot',
    desc: 'Draft manager reviews from performance data, feedback received, goal completion, and activity signals.',
    endpoint: '/performance-growth/ai/review-copilot',
    icon: MessageSquare,
  },
  {
    key: 'bias-detector',
    label: 'Bias Detector',
    desc: 'Scan review text for gendered language, recency bias, and halo/horns effect. Analyze rating distribution across demographics.',
    endpoint: '/performance-growth/ai/bias-detector',
    icon: AlertTriangle,
  },
  {
    key: 'calibration-copilot',
    label: 'Calibration Copilot',
    desc: 'Surface data inconsistencies: similar performers rated differently by different managers. Recommend adjustments.',
    endpoint: '/performance-growth/ai/calibration-copilot',
    icon: BarChart3,
  },
  {
    key: 'performance-trajectory',
    label: 'Performance Trajectory',
    desc: 'Predict performance trends per employee for next cycle. Early warning for declining performance and high-potential identification.',
    endpoint: '/performance-growth/ai/performance-trajectory',
    icon: TrendingUp,
  },
];

export default function AiInsightsTab() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AiResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const runAnalysis = async (featureKey: string, endpoint: string) => {
    setLoading(featureKey);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[featureKey];
      return next;
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
        <span className="text-xs bg-[#4F46E5]/10 text-[#4F46E5] px-2 py-0.5 rounded-full font-medium">Powered by AI</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map(({ key, label, desc, endpoint, icon: Icon }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-[#4F46E5] flex-shrink-0" />
                  <h3 className="font-medium text-[#2c2c2c] text-sm">{label}</h3>
                </div>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
            <button
              onClick={() => runAnalysis(key, endpoint)}
              disabled={loading === key}
              className="w-full px-3 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-medium hover:bg-[#4338ca] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loading === key ? 'Analyzing...' : 'Run Analysis'}
            </button>
            {errors[key] && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {errors[key]}
              </p>
            )}
            {results[key] && !errors[key] && (
              <div className="mt-4 p-3 bg-[#f5f5f0] rounded-lg space-y-2">
                {results[key].prediction && (
                  <p className="text-sm text-[#2c2c2c]">{results[key].prediction as string}</p>
                )}
                {results[key].confidence != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Confidence:</span>
                    <span className="text-xs font-medium text-[#4F46E5]">{results[key].confidence}%</span>
                  </div>
                )}
                {Array.isArray(results[key].insights) &&
                  (results[key].insights as string[]).map((ins, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-[#4F46E5] mt-0.5">•</span>
                      {ins}
                    </p>
                  ))}
                {Array.isArray(results[key].recommendations) &&
                  (results[key].recommendations as string[]).map((rec, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-green-500 mt-0.5">→</span>
                      {rec}
                    </p>
                  ))}
                {Array.isArray(results[key].suggestions) &&
                  (results[key].suggestions as string[]).map((sug, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-[#4F46E5] mt-0.5">↗</span>
                      {sug}
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
