'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Calculator,
  Plus,
  Edit2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Upload,
  FileText,
  Eye,
} from 'lucide-react';

interface TaxDeclaration {
  id: string;
  fiscalYear: string;
  taxRegime: string;
  totalDeclared: number;
  totalVerified: number;
  status: string;
  createdAt: string;
  sections: {
    section: string;
    amount: number;
    description: string;
  }[];
}

interface TaxProof {
  id: string;
  section: string;
  description: string;
  amount: number;
  status: string;
  documentName: string;
  submittedAt: string;
}

interface TaxComputation {
  grossIncome: number;
  totalExemptions: number;
  totalDeductions: number;
  taxableIncome: number;
  taxLiability: number;
  taxPaid: number;
  taxDue: number;
  regime: string;
}

const SECTION_OPTIONS = [
  { value: '80C', label: 'Section 80C (PPF, ELSS, LIC, etc.)' },
  { value: '80D', label: 'Section 80D (Medical Insurance)' },
  { value: '80E', label: 'Section 80E (Education Loan)' },
  { value: '80G', label: 'Section 80G (Donations)' },
  { value: 'hra', label: 'HRA Exemption' },
  { value: 'lta', label: 'LTA Exemption' },
  { value: 'nps', label: 'NPS (80CCD)' },
  { value: 'home_loan', label: 'Home Loan Interest (24B)' },
  { value: 'other', label: 'Other Deductions' },
];

export default function TaxManagementTab() {
  const [declarations, setDeclarations] = useState<TaxDeclaration[]>([]);
  const [proofs, setProofs] = useState<TaxProof[]>([]);
  const [computation, setComputation] = useState<TaxComputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [editingDeclaration, setEditingDeclaration] = useState<TaxDeclaration | null>(null);

  // Declaration form state
  const [formFiscalYear, setFormFiscalYear] = useState('2025-26');
  const [formTaxRegime, setFormTaxRegime] = useState('new');
  const [formSections, setFormSections] = useState<{ section: string; amount: number; description: string }[]>([
    { section: '80C', amount: 0, description: '' },
  ]);
  const [saving, setSaving] = useState(false);

  // Proof form state
  const [proofSection, setProofSection] = useState('80C');
  const [proofDescription, setProofDescription] = useState('');
  const [proofAmount, setProofAmount] = useState(0);
  const [proofDocument, setProofDocument] = useState('');
  const [savingProof, setSavingProof] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [declRes, proofsRes, compRes] = await Promise.all([
        api.get('/payroll-processing/employee/tax/declarations'),
        api.get('/payroll-processing/employee/tax/proofs'),
        api.get('/payroll-processing/employee/tax/computation'),
      ]);

      const declData = Array.isArray(declRes.data) ? declRes.data : declRes.data?.data || [];
      const proofsData = Array.isArray(proofsRes.data) ? proofsRes.data : proofsRes.data?.data || [];
      const compData = compRes.data?.data || compRes.data || {};

      setDeclarations(declData);
      setProofs(proofsData);

      if (compData.grossIncome !== undefined) {
        setComputation({
          grossIncome: compData.grossIncome || 0,
          totalExemptions: compData.totalExemptions || 0,
          totalDeductions: compData.totalDeductions || 0,
          taxableIncome: compData.taxableIncome || 0,
          taxLiability: compData.taxLiability || 0,
          taxPaid: compData.taxPaid || 0,
          taxDue: compData.taxDue || 0,
          regime: compData.regime || 'new',
        });
      }
    } catch {
      setError('Failed to load tax management data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateDeclaration = () => {
    setEditingDeclaration(null);
    setFormFiscalYear('2025-26');
    setFormTaxRegime('new');
    setFormSections([{ section: '80C', amount: 0, description: '' }]);
    setShowDeclarationModal(true);
  };

  const openEditDeclaration = (d: TaxDeclaration) => {
    setEditingDeclaration(d);
    setFormFiscalYear(d.fiscalYear);
    setFormTaxRegime(d.taxRegime);
    setFormSections(d.sections?.length > 0 ? d.sections : [{ section: '80C', amount: 0, description: '' }]);
    setShowDeclarationModal(true);
  };

  const addSection = () => {
    setFormSections([...formSections, { section: '80C', amount: 0, description: '' }]);
  };

  const removeSection = (index: number) => {
    setFormSections(formSections.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, field: string, value: string | number) => {
    const updated = [...formSections];
    updated[index] = { ...updated[index], [field]: value };
    setFormSections(updated);
  };

  const handleSubmitDeclaration = async () => {
    try {
      setSaving(true);
      setError('');
      const payload = {
        fiscalYear: formFiscalYear,
        taxRegime: formTaxRegime,
        sections: formSections.filter((s) => s.amount > 0),
      };
      if (editingDeclaration) {
        await api.patch(`/payroll-processing/employee/tax/declarations/${editingDeclaration.id}`, payload);
        setSuccess('Declaration updated successfully.');
      } else {
        await api.post('/payroll-processing/employee/tax/declarations', payload);
        setSuccess('Declaration created successfully.');
      }
      setShowDeclarationModal(false);
      loadData();
    } catch {
      setError('Failed to save declaration.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!proofDescription.trim() || proofAmount <= 0) return;
    try {
      setSavingProof(true);
      setError('');
      await api.post('/payroll-processing/employee/tax/proofs', {
        section: proofSection,
        description: proofDescription.trim(),
        amount: proofAmount,
        documentName: proofDocument.trim(),
      });
      setSuccess('Tax proof submitted successfully.');
      setShowProofModal(false);
      setProofSection('80C');
      setProofDescription('');
      setProofAmount(0);
      setProofDocument('');
      loadData();
    } catch {
      setError('Failed to submit tax proof.');
    } finally {
      setSavingProof(false);
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-blue-100 text-blue-700',
      verified: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
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
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Tax Management</h2>
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

      {/* Tax Computation Preview */}
      {computation && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Tax Computation Preview</h3>
          <div className="bg-background rounded-xl border border-border p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-text-muted mb-1">Gross Income</p>
                <p className="text-lg font-bold text-text">{formatCurrency(computation.grossIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Exemptions</p>
                <p className="text-lg font-bold text-green-700">-{formatCurrency(computation.totalExemptions)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Deductions</p>
                <p className="text-lg font-bold text-green-700">-{formatCurrency(computation.totalDeductions)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Taxable Income</p>
                <p className="text-lg font-bold text-text">{formatCurrency(computation.taxableIncome)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-text-muted mb-1">Tax Liability</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(computation.taxLiability)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-muted mb-1">Tax Paid</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(computation.taxPaid)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-muted mb-1">Tax Due</p>
                <p className={`text-xl font-bold ${computation.taxDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(computation.taxDue))}
                  {computation.taxDue < 0 ? ' (Refund)' : ''}
                </p>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-3 text-center">
              Regime: {computation.regime === 'old' ? 'Old Tax Regime' : 'New Tax Regime'}
            </p>
          </div>
        </div>
      )}

      {/* Investment Declarations */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Investment Declarations</h3>
          <button onClick={openCreateDeclaration} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
            <Plus className="h-3.5 w-3.5" />
            New Declaration
          </button>
        </div>
        {declarations.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No investment declarations submitted yet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Fiscal Year</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Tax Regime</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Total Declared</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {declarations.map((d) => (
                  <tr key={d.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{d.fiscalYear}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                        {d.taxRegime === 'old' ? 'Old Regime' : 'New Regime'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text font-semibold">{formatCurrency(d.totalDeclared)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(d.status)}`}>
                        {d.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEditDeclaration(d)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tax Proofs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text uppercase tracking-wider">Tax Proofs</h3>
          <button onClick={() => setShowProofModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
            <Upload className="h-3.5 w-3.5" />
            Submit Proof
          </button>
        </div>
        {proofs.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No tax proofs submitted yet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Section</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Document</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {proofs.map((p) => (
                  <tr key={p.id} className="hover:bg-background/50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {p.section}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">{p.description}</td>
                    <td className="px-4 py-3 text-sm text-text font-medium">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3">
                      {p.documentName ? (
                        <div className="flex items-center gap-1 text-sm text-text-muted">
                          <FileText className="h-3.5 w-3.5" />
                          {p.documentName}
                        </div>
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(p.status)}`}>
                        {p.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Declaration Modal */}
      {showDeclarationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{editingDeclaration ? 'Edit Declaration' : 'New Investment Declaration'}</h3>
              <button onClick={() => setShowDeclarationModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Fiscal Year</label>
                  <input
                    type="text"
                    value={formFiscalYear}
                    onChange={(e) => setFormFiscalYear(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g. 2025-26"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Tax Regime</label>
                  <select
                    value={formTaxRegime}
                    onChange={(e) => setFormTaxRegime(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                  >
                    <option value="old">Old Regime</option>
                    <option value="new">New Regime</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-text">Sections</label>
                  <button onClick={addSection} className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium">
                    <Plus className="h-3 w-3" />
                    Add Section
                  </button>
                </div>
                <div className="space-y-3">
                  {formSections.map((s, i) => (
                    <div key={i} className="bg-background rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <select
                            value={s.section}
                            onChange={(e) => updateSection(i, 'section', e.target.value)}
                            className="px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                          >
                            {SECTION_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.value}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={s.amount}
                            onChange={(e) => updateSection(i, 'amount', Number(e.target.value))}
                            className="px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                            placeholder="Amount"
                          />
                          <input
                            type="text"
                            value={s.description}
                            onChange={(e) => updateSection(i, 'description', e.target.value)}
                            className="px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                            placeholder="Description"
                          />
                        </div>
                        {formSections.length > 1 && (
                          <button onClick={() => removeSection(i)} className="p-1 text-text-muted hover:text-red-600 transition-colors mt-1">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowDeclarationModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmitDeclaration} disabled={saving} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingDeclaration ? 'Update' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Proof Modal */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Submit Tax Proof</h3>
              <button onClick={() => setShowProofModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Section</label>
                <select
                  value={proofSection}
                  onChange={(e) => setProofSection(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                >
                  {SECTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <input
                  type="text"
                  value={proofDescription}
                  onChange={(e) => setProofDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. LIC Premium for FY 2025-26"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Amount</label>
                <input
                  type="number"
                  value={proofAmount}
                  onChange={(e) => setProofAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Document Name (placeholder)</label>
                <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white text-sm">
                  <Eye className="h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    value={proofDocument}
                    onChange={(e) => setProofDocument(e.target.value)}
                    className="flex-1 text-text bg-transparent outline-none"
                    placeholder="e.g. lic-receipt-2025.pdf"
                  />
                </div>
                <p className="text-xs text-text-muted mt-1">File upload will be available in a future update.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowProofModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmitProof} disabled={savingProof || !proofDescription.trim() || proofAmount <= 0} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {savingProof ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Proof'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
