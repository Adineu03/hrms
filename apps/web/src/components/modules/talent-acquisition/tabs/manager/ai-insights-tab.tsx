'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, TrendingUp, AlertTriangle, Star, Users, MessageSquare, Zap } from 'lucide-react';

interface AiResult {
  insights?: string[];
  suggestions?: string[];
  recommendations?: string[];
  prediction?: string;
  confidence?: number;
  [key: string]: unknown;
}

const features = [
  {
    key: 'candidate-ranking',
    label: 'AI Candidate Ranking',
    desc: 'Rank applicants by fit score with explainable reasoning per factor',
    endpoint: '/talent-acquisition/ai/candidate-ranking',
    icon: Star,
  },
  {
    key: 'interview-analysis',
    label: 'Interview Transcript Analysis',
    desc: 'Analyze interview recordings for competency signals and potential bias patterns',
    endpoint: '/talent-acquisition/ai/interview-analysis',
    icon: MessageSquare,
  },
  {
    key: 'offer-intelligence',
    label: 'Offer Intelligence',
    desc: 'Suggest competitive compensation and model acceptance probability at different levels',
    endpoint: '/talent-acquisition/ai/offer-intelligence',
    icon: TrendingUp,
  },
  {
    key: 'diversity-nudges',
    label: 'Diversity Pipeline Nudges',
    desc: 'Real-time alerts if pipeline diversity is skewing, with sourcing channel recommendations',
    endpoint: '/talent-acquisition/ai/diversity-nudges',
    icon: Users,
  },
];

export default function AiInsightsTab() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AiResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const runAnalysis = async (featureKey: string, endpoint: string) => {
    setLoading(featureKey);
    setErrors(prev => { const n = { ...prev }; delete n[featureKey]; return n; });
    try {
      const res = await api.post(endpoint, {});
      setResults(prev => ({ ...prev, [featureKey]: (res.data as { data: AiResult }).data }));
    } catch {
      setErrors(prev => ({ ...prev, [featureKey]: 'Analysis failed. Please try again.' }));
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
              {loading === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loading === key ? 'Analyzing...' : 'Run Analysis'}
            </button>
            {errors[key] && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />{errors[key]}
              </p>
            )}
            {results[key] && !errors[key] && (
              <div className="mt-4 p-3 bg-[#f5f5f0] rounded-lg space-y-1.5">
                {results[key].prediction && (
                  <p className="text-sm text-[#2c2c2c] font-medium">{results[key].prediction as string}</p>
                )}
                {Array.isArray(results[key].insights) && (results[key].insights as string[]).slice(0, 3).map((ins, i) => (
                  <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-[#4F46E5] mt-0.5 flex-shrink-0">•</span>{ins}
                  </p>
                ))}
                {Array.isArray(results[key].recommendations) && (results[key].recommendations as string[]).slice(0, 3).map((rec, i) => (
                  <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">→</span>{rec}
                  </p>
                ))}
                {Array.isArray(results[key].suggestions) && (results[key].suggestions as string[]).slice(0, 3).map((sug, i) => (
                  <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">↗</span>{sug}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-[#4F46E5]" />
          <h3 className="font-medium text-[#2c2c2c] text-sm">Manager AI Tools</h3>
        </div>
        <p className="text-xs text-gray-500">
          These AI features help you make faster, fairer hiring decisions. From ranking candidates objectively to ensuring your offers are competitive — get data-driven insights at every step of the hiring process.
        </p>
      </div>
    </div>
  );
}
