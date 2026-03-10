'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, Sparkles, Brain, AlertTriangle, GitMerge, Building2, CheckCircle2 } from 'lucide-react';

interface AiResult {
  mappings?: Array<{ csvColumn: string; hrmsField: string; confidence: number; notes?: string }>;
  unmapped?: string[];
  hierarchy?: Array<{ level: number; role: string; parentRole?: string; headCount: number }>;
  suggestions?: string[];
  overallScore?: number;
  categoryScores?: Array<{ category: string; score: number; issues: string[] }>;
  criticalIssues?: string[];
  recommendations?: string[];
  summary?: string;
  confidence?: number;
  [key: string]: unknown;
}

const features = [
  {
    key: 'ai-column-mapper',
    label: 'AI Column Mapper',
    desc: 'Auto-map CSV column headers to HRMS fields during bulk import',
    endpoint: '/cold-start-setup/ai/ai-column-mapper',
    icon: GitMerge,
  },
  {
    key: 'smart-org-chart-builder',
    label: 'Smart Org Chart Builder',
    desc: 'Infer organizational hierarchy from your employee data automatically',
    endpoint: '/cold-start-setup/ai/smart-org-chart-builder',
    icon: Building2,
  },
  {
    key: 'data-quality-scorer',
    label: 'Data Quality Scorer',
    desc: 'Score the quality and completeness of your imported data',
    endpoint: '/cold-start-setup/ai/data-quality-scorer',
    icon: CheckCircle2,
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
        <h2 className="text-lg font-semibold text-[#2c2c2c]">AI Setup Assistance</h2>
        <span className="text-xs bg-[#4F46E5]/10 text-[#4F46E5] px-2 py-0.5 rounded-full font-medium">
          Powered by AI
        </span>
      </div>
      <p className="text-sm text-gray-500">
        Use AI to speed up your organization setup — auto-map data imports, build org charts, and validate data quality.
      </p>
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
                {typeof results[key].overallScore === 'number' && (
                  <p className="text-sm font-medium">
                    Data Quality Score:{' '}
                    <span className={`${(results[key].overallScore as number) >= 80 ? 'text-green-500' : (results[key].overallScore as number) >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {results[key].overallScore as number}%
                    </span>
                  </p>
                )}
                {Array.isArray(results[key].mappings) &&
                  (results[key].mappings as Array<{ csvColumn: string; hrmsField: string; confidence: number }>)
                    .slice(0, 5)
                    .map((m, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className={`mt-0.5 flex-shrink-0 ${m.confidence > 0.8 ? 'text-green-500' : m.confidence > 0.6 ? 'text-amber-500' : 'text-red-500'}`}>•</span>
                        <span><span className="font-mono">{m.csvColumn}</span> → <span className="font-medium">{m.hrmsField}</span> ({Math.round(m.confidence * 100)}%)</span>
                      </p>
                    ))}
                {Array.isArray(results[key].unmapped) && (results[key].unmapped as string[]).length > 0 && (
                  <p className="text-xs text-amber-600">
                    Unmapped: {(results[key].unmapped as string[]).join(', ')}
                  </p>
                )}
                {Array.isArray(results[key].hierarchy) &&
                  (results[key].hierarchy as Array<{ level: number; role: string; headCount: number }>)
                    .slice(0, 4)
                    .map((h, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-[#4F46E5] mt-0.5 flex-shrink-0">•</span>
                        Level {h.level}: {h.role} ({h.headCount} people)
                      </p>
                    ))}
                {Array.isArray(results[key].categoryScores) &&
                  (results[key].categoryScores as Array<{ category: string; score: number }>)
                    .slice(0, 4)
                    .map((c, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-[#4F46E5] mt-0.5 flex-shrink-0">•</span>
                        {c.category}: <span className={`font-medium ml-1 ${c.score >= 80 ? 'text-green-500' : c.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{c.score}%</span>
                      </p>
                    ))}
                {Array.isArray(results[key].criticalIssues) && (results[key].criticalIssues as string[]).length > 0 &&
                  (results[key].criticalIssues as string[]).slice(0, 2).map((issue, i) => (
                    <p key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {issue}
                    </p>
                  ))}
                {Array.isArray(results[key].suggestions) &&
                  (results[key].suggestions as string[]).slice(0, 2).map((s, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-[#4F46E5] mt-0.5 flex-shrink-0">•</span>
                      {s}
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
