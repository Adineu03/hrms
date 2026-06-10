'use client';

// The only file that imports recharts — loaded via next/dynamic (see lazy-charts.tsx)
// so the chart bundle stays out of the initial JS.

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CATEGORICAL_COLORS, CHART_COLORS } from './types';

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e5e0',
  borderRadius: '10px',
  fontSize: '12px',
  color: '#2c2c2c',
  boxShadow: '0 2px 8px rgba(44,44,44,0.06)',
} as const;

const AXIS_TICK = { fontSize: 11, fill: CHART_COLORS.muted } as const;

export function TrendAreaChart({
  data,
  color = CHART_COLORS.primary,
  height = 220,
  valueFormatter,
  zoomYAxis = false,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
  /** Fit the Y axis to the data range (for slow-moving series like headcount). */
  zoomYAxis?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} strokeWidth={0.5} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
          domain={zoomYAxis ? ['dataMin - 1', 'dataMax + 1'] : [0, 'auto']}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [valueFormatter ? valueFormatter(Number(v ?? 0)) : (v ?? 0), '']}
          separator=""
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={0.08}
          dot={false}
          activeDot={{ r: 3.5, strokeWidth: 0 }}
          isAnimationActive
          animationDuration={700}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 200,
  centerLabel,
  centerSub,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const palette = CATEGORICAL_COLORS;
  const filled = data.filter((d) => d.value > 0);
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Pie
            data={filled}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="92%"
            paddingAngle={2}
            strokeWidth={0}
            isAnimationActive
            animationDuration={700}
          >
            {filled.map((d, i) => (
              <Cell key={d.name} fill={d.color ?? palette[i % palette.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerLabel !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-semibold text-text">{centerLabel}</span>
          {centerSub && <span className="text-xs text-text-muted">{centerSub}</span>}
        </div>
      )}
    </div>
  );
}

export function BarsChart({
  data,
  color = CHART_COLORS.primary,
  height = 200,
  layout = 'horizontal',
}: {
  data: { label: string; value: number; color?: string }[];
  color?: string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
}) {
  const vertical = layout === 'vertical';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={vertical ? 'vertical' : 'horizontal'}
        margin={{ top: 4, right: 8, left: vertical ? 8 : -16, bottom: 0 }}
        barSize={vertical ? 14 : 28}
      >
        <CartesianGrid stroke={CHART_COLORS.grid} strokeWidth={0.5} vertical={vertical} horizontal={!vertical} />
        {vertical ? (
          <>
            <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} width={72} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          </>
        )}
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(44,44,44,0.03)' }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={700}>
          {data.map((d, i) => (
            <Cell key={`${d.label}-${i}`} fill={d.color ?? color} radius={vertical ? 6 : undefined} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
