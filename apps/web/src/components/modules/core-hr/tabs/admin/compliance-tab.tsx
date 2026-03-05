'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';

interface ComplianceSummary {
  expiredDocs: number;
  expiringSoon: number;
  trainingGaps: number;
  totalItems: number;
}

interface ComplianceItem {
  id: string;
  name: string;
  type: string;
  employeeName: string | null;
  expiryDate: string | null;
  status: string;
  description: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; icon: React.ElementType }> = {
  valid: { bg: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  expired: { bg: 'bg-red-50 text-red-700', icon: XCircle },
  expiring_soon: { bg: 'bg-yellow-50 text-yellow-700', icon: AlertTriangle },
  pending: { bg: 'bg-blue-50 text-blue-700', icon: Clock },
  missing: { bg: 'bg-gray-100 text-gray-600', icon: AlertCircle },
};

export default function ComplianceTab() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompliance();
  }, []);

  const loadCompliance = async () => {
    try {
      const res = await api.get('/core-hr/admin/compliance/dashboard');
      const data = res.data;
      if (data.summary) {
        setSummary(data.summary);
      } else {
        setSummary({
          expiredDocs: data.expiredDocs ?? 0,
          expiringSoon: data.expiringSoon ?? 0,
          trainingGaps: data.trainingGaps ?? 0,
          totalItems: data.totalItems ?? 0,
        });
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError('Failed to load compliance data.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading compliance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Compliance Dashboard
        </h2>
        <p className="text-sm text-text-muted">
          Track document expiry, compliance status, and training requirements.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-background border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Total Items</span>
              <ShieldCheck className="h-4 w-4 text-text-muted" />
            </div>
            <p className="text-2xl font-bold text-text mt-1">{summary.totalItems}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-700">Expired Documents</span>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-700 mt-1">{summary.expiredDocs}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-700">Expiring Soon</span>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-700 mt-1">{summary.expiringSoon}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-700">Training Gaps</span>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-700 mt-1">{summary.trainingGaps}</p>
          </div>
        </div>
      )}

      {/* Compliance Items Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Type
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Employee
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Expiry Date
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
              const StatusIcon = statusStyle.icon;
              return (
                <tr
                  key={item.id}
                  className="bg-card hover:bg-background/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-background text-text-muted border border-border">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {item.employeeName || '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {item.expiryDate
                      ? new Date(item.expiryDate).toLocaleDateString()
                      : '--'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted max-w-[200px] truncate">
                    {item.description || '--'}
                  </td>
                </tr>
              );
            })}

            {/* Empty State */}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No compliance items found. Items will appear here as documents and certifications are tracked.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
