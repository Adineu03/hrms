'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Copy,
  TrendingUp,
  Receipt,
  Sparkles,
} from 'lucide-react';

type Severity = 'high' | 'medium' | 'low';
type AnomalyType = 'duplicate' | 'over_limit' | 'outlier' | 'missing_receipt';

interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: Severity;
  reportId: string;
  reportTitle: string;
  employeeName: string;
  category: string | null;
  vendor: string | null;
  amount: number;
  date: string | null;
  fact: string;
  explanation: string;
}

interface AnomalyResponse {
  summary: { total: number; high: number; medium: number; low: number; aiExplained: boolean };
  anomalies: Anomaly[];
}

const TYPE_META: Record<AnomalyType, { label: string; icon: typeof Copy }> = {
  duplicate: { label: 'Duplicate claim', icon: Copy },
  over_limit: { label: 'Over policy limit', icon: ShieldAlert },
  outlier: { label: 'Unusual amount', icon: TrendingUp },
  missing_receipt: { label: 'Missing receipt', icon: Receipt },
};

const SEVERITY_STYLES: Record<Severity, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-gray-50 text-gray-600 border-gray-200',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

export default function ExpenseAnomalyDetectionTab() {
  const [data, setData] = useState<AnomalyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/expense-management/admin/anomalies');
      setData(res.data);
    } catch {
      setError('Failed to run anomaly detection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Anomaly Detection
          </h2>
          <p className="text-sm text-text-muted max-w-2xl">
            Expenses are flagged by deterministic rules (duplicates, policy-limit breaches,
            statistical outliers, missing receipts). AI only writes the plain-English explanation —
            it never decides what counts as an anomaly.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background disabled:opacity-50 transition-colors shrink-0"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Re-scan
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
          <span className="ml-2 text-sm text-text-muted">Scanning expenses...</span>
        </div>
      ) : data && data.summary.total > 0 ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-background rounded-lg border border-border p-3">
              <p className="text-xs text-text-muted">Total flagged</p>
              <p className="text-2xl font-bold text-text">{data.summary.total}</p>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-200 p-3">
              <p className="text-xs text-red-600">High</p>
              <p className="text-2xl font-bold text-red-700">{data.summary.high}</p>
            </div>
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-3">
              <p className="text-xs text-amber-600">Medium</p>
              <p className="text-2xl font-bold text-amber-700">{data.summary.medium}</p>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">Low</p>
              <p className="text-2xl font-bold text-gray-600">{data.summary.low}</p>
            </div>
          </div>

          {data.summary.aiExplained && (
            <p className="inline-flex items-center gap-1.5 text-xs text-text-muted">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Explanations written by AI · flags computed by rules
            </p>
          )}

          {/* Anomaly list */}
          <div className="space-y-3">
            {data.anomalies.map((a) => {
              const meta = TYPE_META[a.type];
              const Icon = meta.icon;
              return (
                <div key={a.id} className="border border-border rounded-xl p-4 bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_STYLES[a.severity]}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                        {a.severity}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-text shrink-0">{formatCurrency(a.amount)}</span>
                  </div>

                  <p className="text-sm text-text mt-2">{a.explanation}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-text-muted">
                    <span>👤 {a.employeeName}</span>
                    <span>📄 {a.reportTitle}</span>
                    {a.vendor && <span>🏪 {a.vendor}</span>}
                    {a.category && <span>🏷️ {a.category}</span>}
                    {a.date && <span>📅 {a.date}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-text">No anomalies detected</p>
          <p className="text-sm text-text-muted">Your expense data looks clean against the current rules.</p>
        </div>
      )}
    </div>
  );
}
