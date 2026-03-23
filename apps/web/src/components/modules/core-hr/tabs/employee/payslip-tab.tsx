'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Receipt,
  DollarSign,
  FileText,
  AlertCircle,
  Info,
} from 'lucide-react';

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

export default function PayslipTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salaryStructure, setSalaryStructure] = useState<SalaryStructure | null>(null);

  useEffect(() => {
    fetchSalaryStructure();
  }, []);

  const fetchSalaryStructure = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/core-hr/employee/payslip/salary-structure');
      setSalaryStructure(res.data);
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

      {/* Payslip History Stub */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Payslip History
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-800 font-medium">Coming Soon</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Payslip history will be available when the Payroll module is activated.
            </p>
          </div>
        </div>
      </div>

      {/* Tax Summary Stub */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Tax Summary
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-800 font-medium">Coming Soon</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Tax summary and declarations will be available when the Payroll module is activated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
