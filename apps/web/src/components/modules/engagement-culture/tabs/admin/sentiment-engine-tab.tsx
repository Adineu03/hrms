'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Smile,
  Meh,
  Frown,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

type Sentiment = 'positive' | 'neutral' | 'negative';

interface SentimentResponse {
  ok: boolean;
  message?: string;
  headline?: string;
  summary?: { totalResponses: number; analyzed: number; positive: number; neutral: number; negative: number };
  themes?: { theme: string; sentiment: string }[];
  samples?: { sentiment: Sentiment; text: string }[];
}

const SENT_META: Record<string, { label: string; color: string; icon: typeof Smile }> = {
  positive: { label: 'Positive', color: 'text-green-700 bg-green-50 border-green-200', icon: Smile },
  neutral: { label: 'Neutral', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: Meh },
  negative: { label: 'Negative', color: 'text-red-700 bg-red-50 border-red-200', icon: Frown },
  mixed: { label: 'Mixed', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Meh },
};

export default function SentimentEngineTab() {
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/engagement-culture/admin/sentiment');
      if (!res.data?.ok) {
        setError(res.data?.message || 'Sentiment analysis is unavailable.');
        setData(null);
      } else {
        setData(res.data);
      }
    } catch {
      setError('Failed to run sentiment analysis.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary;
  const total = s ? s.positive + s.neutral + s.negative : 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sentiment Analysis
          </h2>
          <p className="text-sm text-text-muted max-w-2xl">
            AI reads the free-text answers from your survey responses and classifies their sentiment,
            then surfaces the recurring themes. Based only on real submitted responses.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background disabled:opacity-50 transition-colors shrink-0"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Re-analyze
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          <span className="ml-2 text-sm text-text-muted">Analyzing survey feedback...</span>
        </div>
      ) : s && s.analyzed > 0 ? (
        <>
          {data?.headline && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-text">{data.headline}</p>
              <p className="text-xs text-text-muted mt-1">Based on {s.analyzed} of {s.totalResponses} responses with free-text.</p>
            </div>
          )}

          {/* Distribution */}
          <div className="grid grid-cols-3 gap-3">
            {(['positive', 'neutral', 'negative'] as Sentiment[]).map((k) => {
              const meta = SENT_META[k];
              const Icon = meta.icon;
              const n = s[k];
              return (
                <div key={k} className={`rounded-lg border p-3 ${meta.color}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{meta.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{pct(n)}%</p>
                  <p className="text-xs opacity-80">{n} response{n !== 1 ? 's' : ''}</p>
                </div>
              );
            })}
          </div>

          {/* Themes */}
          {data?.themes && data.themes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text mb-2">Recurring Themes</h3>
              <div className="flex flex-wrap gap-2">
                {data.themes.map((t, i) => {
                  const meta = SENT_META[t.sentiment] || SENT_META.neutral;
                  return (
                    <span key={i} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${meta.color}`}>
                      {t.theme}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sample quotes */}
          {data?.samples && data.samples.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text mb-2">Representative Comments</h3>
              <div className="space-y-2">
                {data.samples.map((q, i) => {
                  const meta = SENT_META[q.sentiment];
                  const Icon = meta.icon;
                  return (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-card">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${meta.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                      <p className="text-sm text-text-muted italic">&ldquo;{q.text}&rdquo;</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : !error ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium text-text">No free-text feedback to analyze yet</p>
          <p className="text-sm text-text-muted">Once employees submit survey responses with written comments, their sentiment will appear here.</p>
        </div>
      ) : null}
    </div>
  );
}
