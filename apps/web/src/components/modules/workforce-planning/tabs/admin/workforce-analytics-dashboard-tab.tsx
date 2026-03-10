'use client';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, X, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';

interface WorkforceAnalyticsSummary {
  totalHeadcount: number;
  openPositions: number;
}

interface AttritionData {
  voluntaryPercent: number;
  involuntaryPercent: number;
  regrettablePercent: number;
}

interface DiversityData {
  malePercent: number;
  femalePercent: number;
  otherPercent?: number;
}

interface PromotionRate {
  internalMobilityRate: number;
  promotionRate: number;
}

interface AnalyticsState {
  summary: WorkforceAnalyticsSummary | null;
  attrition: AttritionData | null;
  diversity: DiversityData | null;
  promotionRate: PromotionRate | null;
}

function PercentBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-700 w-12 text-right">{value?.toFixed(1)}%</span>
    </div>
  );
}

export default function WorkforceAnalyticsDashboardTab() {
  const [data, setData] = useState<AnalyticsState>({ summary: null, attrition: null, diversity: null, promotionRate: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [summaryRes, attritionRes, diversityRes, promotionRes] = await Promise.allSettled([
        api.get('/workforce-planning/admin/workforce-analytics/summary'),
        api.get('/workforce-planning/admin/workforce-analytics/attrition'),
        api.get('/workforce-planning/admin/workforce-analytics/diversity'),
        api.get('/workforce-planning/admin/workforce-analytics/promotion-rate'),
      ]);
      setData({
        summary: summaryRes.status === 'fulfilled' ? (summaryRes.value.data?.data || summaryRes.value.data || null) : null,
        attrition: attritionRes.status === 'fulfilled' ? (attritionRes.value.data?.data || attritionRes.value.data || null) : null,
        diversity: diversityRes.status === 'fulfilled' ? (diversityRes.value.data?.data || diversityRes.value.data || null) : null,
        promotionRate: promotionRes.status === 'fulfilled' ? (promotionRes.value.data?.data || promotionRes.value.data || null) : null,
      });
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading workforce analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#2c2c2c] mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Headcount Summary
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Headcount</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{data.summary?.totalHeadcount ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Open Positions</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{data.summary?.openPositions ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#2c2c2c] mb-4">Attrition Metrics</h2>
          {data.attrition ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Voluntary Attrition</p>
                <PercentBar value={data.attrition.voluntaryPercent || 0} color="bg-orange-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Involuntary Attrition</p>
                <PercentBar value={data.attrition.involuntaryPercent || 0} color="bg-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Regrettable Attrition</p>
                <PercentBar value={data.attrition.regrettablePercent || 0} color="bg-purple-400" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No attrition data available</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#2c2c2c] mb-4">Diversity Breakdown</h2>
          {data.diversity ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Male</p>
                <PercentBar value={data.diversity.malePercent || 0} color="bg-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Female</p>
                <PercentBar value={data.diversity.femalePercent || 0} color="bg-pink-400" />
              </div>
              {data.diversity.otherPercent != null && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Other</p>
                  <PercentBar value={data.diversity.otherPercent} color="bg-teal-400" />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No diversity data available</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#2c2c2c] mb-4">Mobility & Growth Rates</h2>
          {data.promotionRate ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Internal Mobility Rate</p>
                <PercentBar value={data.promotionRate.internalMobilityRate || 0} color="bg-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Promotion Rate</p>
                <PercentBar value={data.promotionRate.promotionRate || 0} color="bg-green-400" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No mobility / promotion data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
