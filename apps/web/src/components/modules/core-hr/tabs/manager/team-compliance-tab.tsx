'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ShieldX,
  ShieldQuestion,
} from 'lucide-react';

interface ComplianceSummary {
  total: number;
  compliant: number;
  expiringSoon: number;
  expired: number;
}

interface ComplianceItem {
  id: string;
  employeeName: string;
  employeeId: string;
  type: string;
  name: string;
  status: 'compliant' | 'expiring_soon' | 'expired' | 'missing';
  expiryDate?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof ShieldCheck }
> = {
  compliant: {
    label: 'Compliant',
    className: 'bg-green-50 text-green-700',
    icon: ShieldCheck,
  },
  expiring_soon: {
    label: 'Expiring Soon',
    className: 'bg-yellow-50 text-yellow-700',
    icon: Clock,
  },
  expired: {
    label: 'Expired',
    className: 'bg-red-50 text-red-700',
    icon: ShieldX,
  },
  missing: {
    label: 'Missing',
    className: 'bg-gray-100 text-gray-600',
    icon: ShieldQuestion,
  },
};

export default function TeamComplianceTab() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/core-hr/manager/compliance');
        const data = res.data;
        setSummary(data.summary || null);
        setItems(data.items || []);
      } catch {
        setError('Failed to load compliance data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading compliance data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text">Team Compliance</h2>
        <p className="text-sm text-text-muted">
          Track compliance items, certifications, and document expiry for your team.
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-text-muted" />
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Total Items
              </span>
            </div>
            <p className="text-2xl font-bold text-text">{summary.total}</p>
          </div>
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Compliant
              </span>
            </div>
            <p className="text-2xl font-bold text-green-700">{summary.compliant}</p>
          </div>
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-yellow-600" />
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Expiring Soon
              </span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{summary.expiringSoon}</p>
          </div>
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <ShieldX className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Expired
              </span>
            </div>
            <p className="text-2xl font-bold text-red-700">{summary.expired}</p>
          </div>
        </div>
      )}

      {/* Compliance Items Table */}
      {items.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Employee
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                  Expiry Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => {
                const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.missing;
                const StatusIcon = config.icon;
                return (
                  <tr
                    key={item.id}
                    className="bg-card hover:bg-background/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {item.employeeName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted capitalize">
                      {item.type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {item.expiryDate
                        ? new Date(item.expiryDate).toLocaleDateString()
                        : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-text-muted">
          No compliance items found. Compliance tracking will populate as
          documents and certifications are added.
        </div>
      )}
    </div>
  );
}
