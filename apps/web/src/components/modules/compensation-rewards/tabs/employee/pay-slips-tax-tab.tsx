'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

interface PaySlip {
  id: string;
  month: string;
  year: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: string;
  downloadUrl?: string;
}

interface InvestmentDeclaration {
  id?: string;
  taxRegime: 'old' | 'new';
  section80c: number;
  section80d: number;
  hraExemption: number;
  otherDeductions: number;
  status: string;
}

type SubTab = 'pay-slips' | 'tax-declarations';

export default function PaySlipsTaxTab() {
  const [subTab, setSubTab] = useState<SubTab>('pay-slips');
  const [paySlips, setPaySlips] = useState<PaySlip[]>([]);
  const [declaration, setDeclaration] = useState<InvestmentDeclaration>({
    taxRegime: 'new',
    section80c: 0,
    section80d: 0,
    hraExemption: 0,
    otherDeductions: 0,
    status: 'draft',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPaySlips = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/compensation-rewards/employee/pay-slips');
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setPaySlips(data);
    } catch {
      setError('Failed to load pay slips.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDeclaration = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/compensation-rewards/employee/pay-slips/investment-declaration');
      const data = res.data?.data || res.data || {};
      if (data.taxRegime) {
        setDeclaration({
          id: data.id,
          taxRegime: data.taxRegime || 'new',
          section80c: data.section80c || 0,
          section80d: data.section80d || 0,
          hraExemption: data.hraExemption || 0,
          otherDeductions: data.otherDeductions || 0,
          status: data.status || 'draft',
        });
      }
    } catch {
      // Declaration might not exist yet, which is fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'pay-slips') {
      loadPaySlips();
    } else {
      loadDeclaration();
    }
  }, [subTab, loadPaySlips, loadDeclaration]);

  const handleDownload = (slip: PaySlip) => {
    if (slip.downloadUrl) {
      window.open(slip.downloadUrl, '_blank');
    }
  };

  const handleSubmitDeclaration = async () => {
    try {
      setSaving(true);
      setError('');
      await api.post('/compensation-rewards/employee/pay-slips/investment-declaration', {
        taxRegime: declaration.taxRegime,
        section80c: declaration.section80c,
        section80d: declaration.section80d,
        hraExemption: declaration.hraExemption,
        otherDeductions: declaration.otherDeductions,
      });
      setSuccess('Investment declaration submitted successfully.');
      loadDeclaration();
    } catch {
      setError('Failed to submit declaration.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'submitted': return 'bg-blue-100 text-blue-700';
      case 'verified': return 'bg-green-100 text-green-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Pay Slips &amp; Tax</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Sub-tab toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSubTab('pay-slips')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            subTab === 'pay-slips'
              ? 'bg-primary text-white'
              : 'bg-background text-text-muted border border-border hover:text-text'
          }`}
        >
          Pay Slips
        </button>
        <button
          onClick={() => setSubTab('tax-declarations')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            subTab === 'tax-declarations'
              ? 'bg-primary text-white'
              : 'bg-background text-text-muted border border-border hover:text-text'
          }`}
        >
          Tax &amp; Declarations
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : subTab === 'pay-slips' ? (
        /* Pay Slips Table */
        paySlips.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No pay slips available yet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Month/Year</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Gross</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Deductions</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Net Pay</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paySlips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{slip.month} {slip.year}</td>
                    <td className="px-4 py-3 text-sm text-text">{formatCurrency(slip.grossPay)}</td>
                    <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(slip.deductions)}</td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(slip.netPay)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(slip.status)}`}>
                        {slip.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDownload(slip)} className="p-1 text-primary hover:text-primary-hover transition-colors" title="Download">
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Tax & Declarations Form */
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Investment Declaration</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(declaration.status)}`}>
              {declaration.status}
            </span>
          </div>

          <div className="space-y-4">
            {/* Tax Regime Toggle */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Tax Regime</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeclaration({ ...declaration, taxRegime: 'old' })}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    declaration.taxRegime === 'old'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-text-muted border-border hover:text-text'
                  }`}
                >
                  Old Regime
                </button>
                <button
                  onClick={() => setDeclaration({ ...declaration, taxRegime: 'new' })}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    declaration.taxRegime === 'new'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-text-muted border-border hover:text-text'
                  }`}
                >
                  New Regime
                </button>
              </div>
            </div>

            {declaration.taxRegime === 'old' && (
              <>
                {/* Section 80C */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Section 80C Investments</label>
                  <input
                    type="number"
                    value={declaration.section80c}
                    onChange={(e) => setDeclaration({ ...declaration, section80c: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g. PPF, ELSS, LIC (max 1,50,000)"
                  />
                  <p className="text-xs text-text-muted mt-1">Max limit: 1,50,000</p>
                </div>

                {/* Section 80D */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Section 80D (Health Insurance)</label>
                  <input
                    type="number"
                    value={declaration.section80d}
                    onChange={(e) => setDeclaration({ ...declaration, section80d: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Health insurance premium"
                  />
                  <p className="text-xs text-text-muted mt-1">Max limit: 25,000 (50,000 for senior citizens)</p>
                </div>

                {/* HRA Exemption */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">HRA Exemption</label>
                  <input
                    type="number"
                    value={declaration.hraExemption}
                    onChange={(e) => setDeclaration({ ...declaration, hraExemption: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Annual rent paid"
                  />
                </div>

                {/* Other Deductions */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Other Deductions</label>
                  <input
                    type="number"
                    value={declaration.otherDeductions}
                    onChange={(e) => setDeclaration({ ...declaration, otherDeductions: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g. NPS, education loan interest"
                  />
                </div>
              </>
            )}

            {declaration.taxRegime === 'new' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  Under the new tax regime, most deductions and exemptions are not available.
                  The benefit comes from lower tax slab rates.
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleSubmitDeclaration}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Declaration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
