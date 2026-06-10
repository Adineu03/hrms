'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Receipt,
  DollarSign,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { formatINR, formatDate } from '@/lib/format';

interface SalaryComponent {
  name: string;
  type: 'earning' | 'deduction';
  amount: number;
  percentage?: number;
}

interface SalaryStructure {
  id: string;
  name: string;
  components: SalaryComponent[];
  grossSalary: number;
  netSalary: number;
}

interface RawComponent {
  name: string;
  type: 'earning' | 'deduction';
  value: number;
  calculationType?: 'percentage' | 'fixed';
}

interface Payslip {
  id: string;
  month: number;
  year: number;
  grossEarnings: string | number | null;
  totalDeductions: string | number | null;
  netPay: string | number | null;
  status?: string | null;
}

interface YtdSummary {
  year: number;
  monthsProcessed: number;
  ytdEarnings: { grossEarnings: string };
  ytdDeductions: { incomeTax: string; totalDeductions: string };
  ytdNetPay: string;
}

interface TaxDeclaration {
  id: string;
  fiscalYear: string;
  taxRegime: string;
  totalDeclared: string | number | null;
  status: string;
  submittedAt: string | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatPeriod = (month: number, year: number) =>
  `${MONTH_NAMES[month - 1] ?? `Month ${month}`} ${year}`;

export default function PayslipTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salaryStructure, setSalaryStructure] = useState<SalaryStructure | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [ytdSummary, setYtdSummary] = useState<YtdSummary | null>(null);
  const [declarations, setDeclarations] = useState<TaxDeclaration[]>([]);

  useEffect(() => {
    fetchSalaryStructure();
    fetchPayrollData();
  }, []);

  // Payslips + tax data come from the payroll-processing module's employee
  // endpoints (house pattern: cross-module API calls from the frontend).
  const fetchPayrollData = async () => {
    const [payslipsRes, ytdRes, declarationsRes] = await Promise.allSettled([
      api.get('/payroll-processing/employee/payslips'),
      api.get('/payroll-processing/employee/payslips/ytd-summary'),
      api.get('/payroll-processing/employee/tax/declarations'),
    ]);
    if (payslipsRes.status === 'fulfilled') {
      const rows = payslipsRes.value.data?.data;
      setPayslips(Array.isArray(rows) ? rows : []);
    }
    if (ytdRes.status === 'fulfilled') {
      setYtdSummary(ytdRes.value.data?.data ?? null);
    }
    if (declarationsRes.status === 'fulfilled') {
      const rows = declarationsRes.value.data?.data;
      setDeclarations(Array.isArray(rows) ? rows : []);
    }
  };

  const fetchSalaryStructure = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/core-hr/employee/payslip/salary-structure');
      // Endpoint returns { message, salaryStructure: { name, components:[{ value, calculationType }] }, assignment: { ctc, basicSalary } }.
      const body = res.data;
      const structure = body?.salaryStructure ?? body?.data?.salaryStructure ?? null;
      if (!structure) {
        setSalaryStructure(null);
        return;
      }
      const assignment = body?.assignment ?? body?.data?.assignment ?? {};
      const annualCtc = Number(assignment.ctc) || 0;
      const monthlyCtc = annualCtc / 12;

      // Component values are percentages of monthly CTC or fixed monthly amounts.
      const components: SalaryComponent[] = (structure.components ?? []).map(
        (c: RawComponent) => {
          const amount =
            c.calculationType === 'fixed'
              ? c.value
              : Math.round((monthlyCtc * c.value) / 100);
          return {
            name: c.name,
            type: c.type,
            amount,
            percentage: c.calculationType === 'percentage' ? c.value : undefined,
          };
        }
      );
      const grossSalary = components
        .filter((c) => c.type === 'earning')
        .reduce((sum, c) => sum + c.amount, 0);
      const totalDeductions = components
        .filter((c) => c.type === 'deduction')
        .reduce((sum, c) => sum + c.amount, 0);

      setSalaryStructure({
        id: structure.id,
        name: structure.name,
        components,
        grossSalary,
        netSalary: grossSalary - totalDeductions,
      });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setSalaryStructure(null);
      } else {
        setError('Failed to load salary structure.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted">Loading salary details...</span>
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
    <div className="space-y-8">
      {/* Salary Structure */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Salary Structure
        </h3>

        {salaryStructure ? (
          <div className="space-y-4">
            <div className="bg-background rounded-lg border border-border p-4">
              <p className="text-sm text-text-muted mb-1">Structure Name</p>
              <p className="text-sm font-semibold text-text">{salaryStructure.name}</p>
            </div>

            {/* Salary Components Table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                      Component
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                      Type
                    </th>
                    <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(salaryStructure.components ?? []).map((comp, idx) => (
                    <tr key={idx} className="bg-card hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text font-medium">{comp.name}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            comp.type === 'earning'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {comp.type === 'earning' ? 'Earning' : 'Deduction'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text text-right font-mono">
                        {comp.type === 'deduction' ? '-' : ''}
                        {(comp.amount ?? 0).toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                          minimumFractionDigits: 0,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-background border-t-2 border-border">
                    <td className="px-4 py-3 text-sm font-semibold text-text" colSpan={2}>
                      Gross Salary
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-text text-right font-mono">
                      {(salaryStructure.grossSalary ?? 0).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                      })}
                    </td>
                  </tr>
                  <tr className="bg-background">
                    <td className="px-4 py-3 text-sm font-bold text-primary" colSpan={2}>
                      Net Salary
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-primary text-right font-mono">
                      {(salaryStructure.netSalary ?? 0).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-background rounded-lg border border-border">
            <Receipt className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-text">No salary structure assigned yet.</p>
            <p className="text-xs text-text-muted mt-1">
              Contact your HR administrator to set up your salary structure.
            </p>
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* Payslip History */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Payslip History
        </h3>

        {payslips.length > 0 ? (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Period
                  </th>
                  <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Gross Earnings
                  </th>
                  <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Deductions
                  </th>
                  <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Net Pay
                  </th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payslips.map((ps) => (
                  <tr key={ps.id} className="bg-card hover:bg-background/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      {formatPeriod(ps.month, ps.year)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text text-right font-mono">
                      {formatINR(Number(ps.grossEarnings) || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-700 text-right font-mono">
                      -{formatINR(Number(ps.totalDeductions) || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text text-right font-mono font-semibold">
                      {formatINR(Number(ps.netPay) || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          ps.status === 'published'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ps.status ?? 'generated'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-background rounded-lg border border-border">
            <FileText className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-text">No payslips available yet.</p>
            <p className="text-xs text-text-muted mt-1">
              Payslips will appear here once payroll has been processed for you.
            </p>
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* Tax Summary */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Tax Summary
        </h3>

        {ytdSummary && ytdSummary.monthsProcessed > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Year-to-date figures for {ytdSummary.year} ({ytdSummary.monthsProcessed} month
              {ytdSummary.monthsProcessed === 1 ? '' : 's'} processed).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-background rounded-lg border border-border p-4">
                <p className="text-xs text-text-muted mb-1">YTD Gross Earnings</p>
                <p className="text-lg font-semibold text-text font-mono">
                  {formatINR(Number(ytdSummary.ytdEarnings?.grossEarnings) || 0)}
                </p>
              </div>
              <div className="bg-background rounded-lg border border-border p-4">
                <p className="text-xs text-text-muted mb-1">YTD Income Tax (TDS)</p>
                <p className="text-lg font-semibold text-text font-mono">
                  {formatINR(Number(ytdSummary.ytdDeductions?.incomeTax) || 0)}
                </p>
              </div>
              <div className="bg-background rounded-lg border border-border p-4">
                <p className="text-xs text-text-muted mb-1">YTD Total Deductions</p>
                <p className="text-lg font-semibold text-text font-mono">
                  {formatINR(Number(ytdSummary.ytdDeductions?.totalDeductions) || 0)}
                </p>
              </div>
              <div className="bg-background rounded-lg border border-border p-4">
                <p className="text-xs text-text-muted mb-1">YTD Net Pay</p>
                <p className="text-lg font-semibold text-accent font-mono">
                  {formatINR(Number(ytdSummary.ytdNetPay) || 0)}
                </p>
              </div>
            </div>

            {declarations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text mb-2">Investment Declarations</h4>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-background border-b border-border">
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                          Fiscal Year
                        </th>
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                          Tax Regime
                        </th>
                        <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                          Total Declared
                        </th>
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                          Status
                        </th>
                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                          Submitted
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {declarations.map((decl) => (
                        <tr key={decl.id} className="bg-card hover:bg-background/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-text font-medium">
                            {decl.fiscalYear}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-muted capitalize">
                            {decl.taxRegime} regime
                          </td>
                          <td className="px-4 py-3 text-sm text-text text-right font-mono">
                            {formatINR(Number(decl.totalDeclared) || 0)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                decl.status === 'verified'
                                  ? 'bg-green-50 text-green-700'
                                  : decl.status === 'rejected'
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-yellow-50 text-yellow-700'
                              }`}
                            >
                              {decl.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-muted">
                            {formatDate(decl.submittedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-background rounded-lg border border-border">
            <Receipt className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-text">No tax data for this year yet.</p>
            <p className="text-xs text-text-muted mt-1">
              Your year-to-date tax summary will appear here once payroll has been processed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
