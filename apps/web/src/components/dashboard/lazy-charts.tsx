'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

function ChartLoading({ height = 200 }: { height?: number }) {
  return <Skeleton className="w-full rounded-xl" style={{ height }} />;
}

export const TrendAreaChart = dynamic(() => import('./charts').then((m) => m.TrendAreaChart), {
  ssr: false,
  loading: () => <ChartLoading height={220} />,
});

export const DonutChart = dynamic(() => import('./charts').then((m) => m.DonutChart), {
  ssr: false,
  loading: () => <ChartLoading />,
});

export const BarsChart = dynamic(() => import('./charts').then((m) => m.BarsChart), {
  ssr: false,
  loading: () => <ChartLoading />,
});
