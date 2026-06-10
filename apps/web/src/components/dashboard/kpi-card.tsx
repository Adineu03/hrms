'use client';

import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { formatINRCompact } from '@/lib/format';
import { CHART_COLORS, type KpiValue } from './types';

/** Animates 0 → value with an ease-out curve (skipped for reduced motion). */
function useCountUp(target: number, durationMs = 700): number {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(target * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, durationMs]);

  return display;
}

/** Tiny inline sparkline — pure SVG so KPI cards never wait on the chart bundle. */
export function Sparkline({ data, color = CHART_COLORS.primary }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const w = 64;
  const h = 22;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data
    .map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function formatValue(kpi: KpiValue, animated: number): string {
  if (kpi.unit === 'INR') return formatINRCompact(Math.round(animated));
  if (kpi.unit === '%') return `${Math.round(animated)}%`;
  if (Number.isInteger(kpi.value)) return String(Math.round(animated));
  return animated.toFixed(1);
}

export function KpiCard({
  kpi,
  icon: Icon,
  sparkColor,
  delayMs = 0,
}: {
  kpi: KpiValue;
  icon?: LucideIcon;
  sparkColor?: string;
  delayMs?: number;
}) {
  const animated = useCountUp(kpi.value);
  const deltaPositive = (kpi.delta ?? 0) > 0;
  const deltaNegative = (kpi.delta ?? 0) < 0;

  return (
    <div
      className="dash-rise bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow p-5"
      style={{ ['--rise-delay' as string]: `${delayMs}ms` }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{kpi.label}</p>
        {Icon && <Icon className="h-4 w-4 text-text-muted" />}
      </div>
      <p className="text-3xl font-semibold text-text mt-2 tabular-nums">
        {formatValue(kpi, animated)}
        {kpi.unit === 'days' && <span className="text-base font-normal text-text-muted ml-1">days</span>}
      </p>
      <div className="flex items-end justify-between mt-3 gap-2 min-h-[22px]">
        <div className="min-w-0">
          {kpi.delta !== undefined && kpi.delta !== 0 && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-2 py-0.5 mr-1.5 ${
                deltaPositive
                  ? 'bg-emerald-50 text-[#059669]'
                  : deltaNegative
                    ? 'bg-red-50 text-red-600'
                    : 'bg-background text-text-muted'
              }`}
            >
              {deltaPositive ? '▲' : deltaNegative ? '▼' : ''} {deltaPositive ? '+' : ''}
              {kpi.delta}
            </span>
          )}
          {kpi.deltaLabel && <span className="text-xs text-text-muted truncate">{kpi.deltaLabel}</span>}
        </div>
        {kpi.spark && <Sparkline data={kpi.spark} color={sparkColor} />}
      </div>
    </div>
  );
}
