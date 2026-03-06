'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Banknote,
  Loader2,
  AlertCircle,
  Inbox,
  DollarSign,
  TrendingUp,
  Calendar,
  Award,
} from 'lucide-react';

interface SalaryBreakdown {
  basic: number;
  hra: number;
  da: number;
  specialAllowance: number;
  otherAllowances: number;
  grossPay: number;
  ctc: number;
  effectiveFrom: string;
  components: { name: string; type: string; amount: number }[];
}

interface SalaryRevision {
  id: string;
  effectiveDate: string;
  previousCtc: number;
  revisedCtc: number;
  incrementPercent: number;
  reason: string;
  approvedBy: string;
}

interface BenefitItem {
  id: string;
  name: string;
  type: string;
  value: number;
  frequency: string;
  status: string;
}

export default function SalaryStructureTab() {
  const [salary, setSalary] = useState<SalaryBreakdown | null>(null);
  const [revisions, setRevisions] = useState<SalaryRevision[]>([]);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [salaryRes, historyRes, benefitsRes] = await Promise.all([
        api.get('/payroll-processing/employee/salary/current'),
        api.get('/payroll-processing/employee/salary/history'),
        api.get('/payroll-processing/employee/salary/benefits'),
      ]);

      const salaryData = salaryRes.data?.data || salaryRes.data || {};
      const historyData = Array.isArray(historyRes.data) ? historyRes.data : historyRes.data?.data || [];
      const benefitsData = Array.isArray(benefitsRes.data) ? benefitsRes.data : benefitsRes.data?.data || [];

      if (salaryData.basic !== undefined || salaryData.ctc !== undefined) {
        setSalary({
          basic: salaryData.basic || 0,
          hra: salaryData.hra || 0,
          da: salaryData.da || 0,
          specialAllowance: salaryData.specialAllowance || 0,
          otherAllowances: salaryData.otherAllowances || 0,
          grossPay: salaryData.grossPay || 0,
          ctc: salaryData.ctc || 0,
          effectiveFrom: salaryData.effectiveFrom || '',
          components: salaryData.components || [],
        });
      }
      setRevisions(historyData);
      setBenefits(benefitsData);
    } catch {
      setError('Failed to load salary structure.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error && !salary) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Banknote className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Salary Structure</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Current Salary Breakdown */}
      {salary ? (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Current Salary Breakdown</h3>

          {/* CTC and Key Figures */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-primary/5 rounded-xl border border-primary/20 p-5 text-center">
              <p className="text-sm text-text-muted mb-1">Annual CTC</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(salary.ctc)}</p>
              <p className="text-xs text-text-muted mt-1">
                Monthly: {formatCurrency(salary.ctc / 12)}
              </p>
            </div>
            <div className="bg-background rounded-xl border border-border p-5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-green-500" />
                <p className="text-sm text-text-muted">Gross Pay (Monthly)</p>
              </div>
              <p className="text-2xl font-bold text-text">{formatCurrency(salary.grossPay)}</p>
            </div>
            <div className="bg-background rounded-xl border border-border p-5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                <p className="text-sm text-text-muted">Effective From</p>
              </div>
              <p className="text-lg font-bold text-text">
                {salary.effectiveFrom ? new Date(salary.effectiveFrom).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          {/* Detailed Components */}
          <div className="bg-background rounded-xl border border-border p-5">
            <h4 className="text-sm font-semibold text-text mb-3">Component Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-text-muted">Basic Pay</span>
                <span className="text-text font-medium">{formatCurrency(salary.basic)}</span>
              </div>
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-text-muted">HRA</span>
                <span className="text-text font-medium">{formatCurrency(salary.hra)}</span>
              </div>
              {salary.da > 0 && (
                <div className="flex justify-between text-sm py-1.5">
                  <span className="text-text-muted">Dearness Allowance</span>
                  <span className="text-text font-medium">{formatCurrency(salary.da)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-text-muted">Special Allowance</span>
                <span className="text-text font-medium">{formatCurrency(salary.specialAllowance)}</span>
              </div>
              {salary.otherAllowances > 0 && (
                <div className="flex justify-between text-sm py-1.5">
                  <span className="text-text-muted">Other Allowances</span>
                  <span className="text-text font-medium">{formatCurrency(salary.otherAllowances)}</span>
                </div>
              )}
              {/* Additional components from API */}
              {(salary.components || []).map((c, i) => (
                <div key={i} className="flex justify-between text-sm py-1.5">
                  <span className="text-text-muted">{c.name}</span>
                  <span className={`font-medium ${c.type === 'deduction' ? 'text-red-600' : 'text-text'}`}>
                    {c.type === 'deduction' ? '-' : ''}{formatCurrency(c.amount)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
                <span className="text-text">Gross Pay (Monthly)</span>
                <span className="text-green-700">{formatCurrency(salary.grossPay)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 mb-8">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">Salary structure not available yet.</p>
        </div>
      )}

      {/* Salary Revision History */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Salary Revision History</h3>
        </div>
        {revisions.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No salary revisions recorded.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Effective Date</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Previous CTC</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Revised CTC</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Increment</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Reason</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {revisions.map((r) => (
                  <tr key={r.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatCurrency(r.previousCtc)}</td>
                    <td className="px-4 py-3 text-sm text-text font-semibold">{formatCurrency(r.revisedCtc)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        +{r.incrementPercent?.toFixed(1) || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted capitalize">{r.reason?.replace('_', ' ') || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{r.approvedBy || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Benefits Summary */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Award className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Benefits Summary</h3>
        </div>
        {benefits.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No benefits assigned.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {benefits.map((b) => (
              <div key={b.id} className="bg-background rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-text">{b.name}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {b.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Type</span>
                    <span className="text-text font-medium capitalize">{b.type?.replace('_', ' ') || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Value</span>
                    <span className="text-text font-medium">{formatCurrency(b.value)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Frequency</span>
                    <span className="text-text font-medium capitalize">{b.frequency || '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
