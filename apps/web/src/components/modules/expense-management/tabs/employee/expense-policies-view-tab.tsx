'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  BookOpen,
  Loader2,
  AlertCircle,
  Inbox,
  Shield,
  DollarSign,
} from 'lucide-react';

interface ExpenseCategoryInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
}

interface PolicyInfo {
  id: string;
  name: string;
  categoryName: string;
  maxPerClaim: number;
  maxPerMonth: number;
  receiptRequired: boolean;
  perDiemRate: number;
  approvalLevels: number;
}

interface SpendingLimit {
  id: string;
  categoryName: string;
  monthlyLimit: number;
  usedThisMonth: number;
  remainingThisMonth: number;
  utilizationPercent: number;
}

export default function ExpensePoliciesViewTab() {
  const [categories, setCategories] = useState<ExpenseCategoryInfo[]>([]);
  const [policies, setPolicies] = useState<PolicyInfo[]>([]);
  const [spendingLimits, setSpendingLimits] = useState<SpendingLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [catRes, polRes, limitsRes] = await Promise.all([
        api.get('/expense-management/employee/policies/categories'),
        api.get('/expense-management/employee/policies/policies'),
        api.get('/expense-management/employee/policies/spending-limits'),
      ]);

      const catData = Array.isArray(catRes.data) ? catRes.data : catRes.data?.data || [];
      const polData = Array.isArray(polRes.data) ? polRes.data : polRes.data?.data || [];
      const limitsData = Array.isArray(limitsRes.data) ? limitsRes.data : limitsRes.data?.data || [];

      setCategories(catData);
      setPolicies(polData);
      setSpendingLimits(limitsData);
    } catch {
      setError('Failed to load expense policies.');
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

  if (error && categories.length === 0) {
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
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Expense Policies</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Available Categories */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Available Expense Categories</h3>
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No expense categories available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div key={c.id} className="bg-background rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-text">{c.name}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {c.description && (
                  <p className="text-xs text-text-muted">{c.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Policy Table */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Policy Details</h3>
        </div>
        {policies.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No expense policies available.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Category</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Policy</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Max / Claim</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Max / Month</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Receipt Req.</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Per Diem</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Approvals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {policies.map((p) => (
                  <tr key={p.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {p.categoryName || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-text">{p.maxPerClaim > 0 ? formatCurrency(p.maxPerClaim) : 'No limit'}</td>
                    <td className="px-4 py-3 text-sm text-text">{p.maxPerMonth > 0 ? formatCurrency(p.maxPerMonth) : 'No limit'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.receiptRequired ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {p.receiptRequired ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">{p.perDiemRate > 0 ? formatCurrency(p.perDiemRate) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{p.approvalLevels} level{p.approvalLevels !== 1 ? 's' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Spending Limits */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">My Spending Limits (This Month)</h3>
        </div>
        {spendingLimits.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No spending limit data available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {spendingLimits.map((sl) => (
              <div key={sl.id} className="bg-background rounded-xl border border-border p-4">
                <h4 className="text-sm font-medium text-text mb-3">{sl.categoryName}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Monthly Limit</span>
                    <span className="text-text font-medium">{formatCurrency(sl.monthlyLimit)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Used</span>
                    <span className="text-text font-medium">{formatCurrency(sl.usedThisMonth)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Remaining</span>
                    <span className={`font-medium ${sl.remainingThisMonth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(sl.remainingThisMonth)}
                    </span>
                  </div>
                  <div className="pt-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          sl.utilizationPercent > 100 ? 'bg-red-500' :
                          sl.utilizationPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(sl.utilizationPercent, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1 text-right">{sl.utilizationPercent.toFixed(1)}% used</p>
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
