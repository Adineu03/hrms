'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * One-line AI insight strip for report tabs. Fail-soft by design: renders
 * NOTHING until a non-empty insight arrives, and stays absent on any error —
 * no loading state, no error state, no console noise.
 */
export function AiInsightBanner({ endpoint }: { endpoint: string }) {
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data?: { insight?: string | null } }>(endpoint)
      .then((res) => {
        const text = res.data?.data?.insight;
        if (!cancelled && typeof text === 'string' && text.trim()) {
          setInsight(text.trim());
        }
      })
      .catch(() => {
        /* silently absent */
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  if (!insight) return null;

  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
      <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted leading-none mb-1">
          AI insight
        </p>
        <p className="text-sm text-text leading-snug">{insight}</p>
      </div>
    </div>
  );
}
