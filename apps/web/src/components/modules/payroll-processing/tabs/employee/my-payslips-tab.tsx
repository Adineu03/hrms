'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  FileText,
  Loader2,
  AlertCircle,
  Inbox,
  Download,
  Eye,
  X,
  DollarSign,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface Payslip {
  id: string;
  month: number;
  year: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  generatedAt: string;
  downloadUrl: string;
}

interface PayslipDetail {
  id: string;
  month: number;
  year: number;
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  workingDays: number;
  lop: number;
  status: string;
}

interface YtdSummary {
  totalEarnings: number;
  totalDeductions: number;
  totalNetPay: number;
  totalTaxPaid: number;
  monthsProcessed: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MyPayslipsTab() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [ytdSummary, setYtdSummary] = useState<YtdSummary | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [payslipsRes, ytdRes] = await Promise.all([
        api.get('/payroll-processing/employee/payslips'),
        api.get('/payroll-processing/employee/payslips/ytd-summary'),
      ]);

      const payslipsData = Array.isArray(payslipsRes.data) ? payslipsRes.data : payslipsRes.data?.data || [];
      const ytdData = ytdRes.data?.data || ytdRes.data || {};

      setPayslips(payslipsData);
      setYtdSummary({
        totalEarnings: ytdData.totalEarnings || 0,
        totalDeductions: ytdData.totalDeductions || 0,
        totalNetPay: ytdData.totalNetPay || 0,
        totalTaxPaid: ytdData.totalTaxPaid || 0,
        monthsProcessed: ytdData.monthsProcessed || 0,
      });
    } catch {
      setError('Failed to load payslips.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const viewPayslipDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      setError('');
      const res = await api.get(`/payroll-processing/employee/payslips/${id}`);
      const data = res.data?.data || res.data || {};
      setSelectedPayslip(data);
      setShowDetailModal(true);
    } catch {
      setError('Failed to load payslip details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      generated: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">My Payslips</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* YTD Summary Cards */}
      {ytdSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-green-500" />
              <p className="text-sm text-text-muted">YTD Earnings</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(ytdSummary.totalEarnings)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-red-500" />
              <p className="text-sm text-text-muted">YTD Deductions</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(ytdSummary.totalDeductions)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-sm text-text-muted">YTD Net Pay</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(ytdSummary.totalNetPay)}</p>
          </div>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-3.5 w-3.5 text-purple-500" />
              <p className="text-sm text-text-muted">Tax Paid (YTD)</p>
            </div>
            <p className="text-2xl font-bold text-text">{formatCurrency(ytdSummary.totalTaxPaid)}</p>
            <p className="text-xs text-text-muted mt-1">{ytdSummary.monthsProcessed} months</p>
          </div>
        </div>
      )}

      {/* Payslips List */}
      {payslips.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No payslips available yet.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Period</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Gross Pay</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Deductions</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Net Pay</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payslips.map((p) => (
                <tr key={p.id} className="hover:bg-background/50">
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    {MONTHS[p.month - 1]} {p.year}
                  </td>
                  <td className="px-4 py-3 text-sm text-text">{formatCurrency(p.grossPay)}</td>
                  <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(p.totalDeductions)}</td>
                  <td className="px-4 py-3 text-sm text-text font-semibold">{formatCurrency(p.netPay)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(p.status)}`}>
                      {p.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewPayslipDetail(p.id)}
                        disabled={loadingDetail}
                        className="p-1 text-text-muted hover:text-primary transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {p.downloadUrl && (
                        <a
                          href={p.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-text-muted hover:text-primary transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payslip Detail Modal */}
      {showDetailModal && selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">
                Payslip — {MONTHS[selectedPayslip.month - 1]} {selectedPayslip.year}
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-background rounded-lg p-3 text-center">
                <p className="text-xs text-text-muted mb-1">Working Days</p>
                <p className="text-lg font-bold text-text">{selectedPayslip.workingDays || 0}</p>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <p className="text-xs text-text-muted mb-1">LOP Days</p>
                <p className="text-lg font-bold text-text">{selectedPayslip.lop || 0}</p>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <p className="text-xs text-text-muted mb-1">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedPayslip.status)}`}>
                  {selectedPayslip.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Earnings */}
              <div>
                <h4 className="text-sm font-semibold text-text uppercase tracking-wider mb-2">Earnings</h4>
                <div className="space-y-2">
                  {(selectedPayslip.earnings || []).map((e, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-text-muted">{e.name}</span>
                      <span className="text-text font-medium">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                    <span className="text-text">Total Earnings</span>
                    <span className="text-green-700">{formatCurrency(selectedPayslip.grossPay)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="text-sm font-semibold text-text uppercase tracking-wider mb-2">Deductions</h4>
                <div className="space-y-2">
                  {(selectedPayslip.deductions || []).map((d, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-text-muted">{d.name}</span>
                      <span className="text-text font-medium">{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                    <span className="text-text">Total Deductions</span>
                    <span className="text-red-700">{formatCurrency(selectedPayslip.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 text-center">
              <p className="text-sm text-text-muted mb-1">Net Pay</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(selectedPayslip.netPay)}</p>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
