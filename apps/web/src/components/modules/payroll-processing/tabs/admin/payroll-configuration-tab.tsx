'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Save,
} from 'lucide-react';

interface SalaryComponent {
  id: string;
  name: string;
  type: string;
  category: string;
  calculationMethod: string;
  calculationValue: number;
  isStatutory: boolean;
  isTaxable: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PayrollConfig {
  id: string;
  payrollCycleDay: number;
  paymentDay: number;
  taxRegime: string;
  pfEnabled: boolean;
  pfRate: number;
  esiEnabled: boolean;
  esiRate: number;
  ptEnabled: boolean;
}

const COMPONENT_TYPE_OPTIONS = [
  { value: 'earning', label: 'Earning' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'reimbursement', label: 'Reimbursement' },
];

const CATEGORY_OPTIONS = [
  { value: 'basic', label: 'Basic' },
  { value: 'hra', label: 'HRA' },
  { value: 'da', label: 'DA' },
  { value: 'special_allowance', label: 'Special Allowance' },
  { value: 'conveyance', label: 'Conveyance' },
  { value: 'medical', label: 'Medical' },
  { value: 'pf', label: 'PF' },
  { value: 'esi', label: 'ESI' },
  { value: 'pt', label: 'Professional Tax' },
  { value: 'tds', label: 'TDS' },
  { value: 'other', label: 'Other' },
];

const CALCULATION_OPTIONS = [
  { value: 'fixed', label: 'Fixed Amount' },
  { value: 'percentage_of_basic', label: '% of Basic' },
  { value: 'percentage_of_gross', label: '% of Gross' },
  { value: 'slab_based', label: 'Slab Based' },
];

const TAX_REGIME_OPTIONS = [
  { value: 'old', label: 'Old Regime' },
  { value: 'new', label: 'New Regime' },
  { value: 'employee_choice', label: 'Employee Choice' },
];

export default function PayrollConfigurationTab() {
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [config, setConfig] = useState<PayrollConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SalaryComponent | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('earning');
  const [formCategory, setFormCategory] = useState('other');
  const [formCalculation, setFormCalculation] = useState('fixed');
  const [formCalculationValue, setFormCalculationValue] = useState(0);
  const [formIsStatutory, setFormIsStatutory] = useState(false);
  const [formIsTaxable, setFormIsTaxable] = useState(true);
  const [saving, setSaving] = useState(false);

  // Config form state
  const [cfgCycleDay, setCfgCycleDay] = useState(1);
  const [cfgPaymentDay, setCfgPaymentDay] = useState(1);
  const [cfgTaxRegime, setCfgTaxRegime] = useState('new');
  const [cfgPfEnabled, setCfgPfEnabled] = useState(true);
  const [cfgPfRate, setCfgPfRate] = useState(12);
  const [cfgEsiEnabled, setCfgEsiEnabled] = useState(true);
  const [cfgEsiRate, setCfgEsiRate] = useState(0.75);
  const [cfgPtEnabled, setCfgPtEnabled] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [compRes, cfgRes] = await Promise.all([
        api.get('/payroll-processing/admin/configuration/components'),
        api.get('/payroll-processing/admin/configuration/config'),
      ]);

      const compData = Array.isArray(compRes.data) ? compRes.data : compRes.data?.data || [];
      const cfgData = cfgRes.data?.data || cfgRes.data || {};

      setComponents(compData);

      if (cfgData && cfgData.id) {
        setConfig(cfgData);
        setCfgCycleDay(cfgData.payrollCycleDay || 1);
        setCfgPaymentDay(cfgData.paymentDay || 1);
        setCfgTaxRegime(cfgData.taxRegime || 'new');
        setCfgPfEnabled(cfgData.pfEnabled ?? true);
        setCfgPfRate(cfgData.pfRate || 12);
        setCfgEsiEnabled(cfgData.esiEnabled ?? true);
        setCfgEsiRate(cfgData.esiRate || 0.75);
        setCfgPtEnabled(cfgData.ptEnabled ?? true);
      }
    } catch {
      setError('Failed to load payroll configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormType('earning');
    setFormCategory('other');
    setFormCalculation('fixed');
    setFormCalculationValue(0);
    setFormIsStatutory(false);
    setFormIsTaxable(true);
    setShowModal(true);
  };

  const openEdit = (c: SalaryComponent) => {
    setEditing(c);
    setFormName(c.name);
    setFormType(c.type);
    setFormCategory(c.category);
    setFormCalculation(c.calculationMethod);
    setFormCalculationValue(c.calculationValue || 0);
    setFormIsStatutory(c.isStatutory);
    setFormIsTaxable(c.isTaxable);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;
    try {
      setSaving(true);
      setError('');
      const payload = {
        name: formName.trim(),
        type: formType,
        category: formCategory,
        calculationMethod: formCalculation,
        calculationValue: formCalculationValue,
        isStatutory: formIsStatutory,
        isTaxable: formIsTaxable,
      };
      if (editing) {
        await api.patch(`/payroll-processing/admin/configuration/components/${editing.id}`, payload);
        setSuccess('Salary component updated successfully.');
      } else {
        await api.post('/payroll-processing/admin/configuration/components', payload);
        setSuccess('Salary component created successfully.');
      }
      setShowModal(false);
      loadData();
    } catch {
      setError('Failed to save salary component.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary component?')) return;
    try {
      setError('');
      await api.delete(`/payroll-processing/admin/configuration/components/${id}`);
      setSuccess('Salary component deleted.');
      loadData();
    } catch {
      setError('Failed to delete salary component.');
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      setError('');
      const payload = {
        payrollCycleDay: cfgCycleDay,
        paymentDay: cfgPaymentDay,
        taxRegime: cfgTaxRegime,
        pfEnabled: cfgPfEnabled,
        pfRate: cfgPfRate,
        esiEnabled: cfgEsiEnabled,
        esiRate: cfgEsiRate,
        ptEnabled: cfgPtEnabled,
      };
      await api.post('/payroll-processing/admin/configuration/config', payload);
      setSuccess('Payroll configuration saved successfully.');
      loadData();
    } catch {
      setError('Failed to save payroll configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Payroll Configuration</h2>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Add Component
        </button>
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

      {/* Salary Components Table */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Salary Components</h3>
        {components.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">No salary components configured yet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Category</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Calculation</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Statutory</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Taxable</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {components.map((c) => (
                  <tr key={c.id} className="hover:bg-background/50">
                    <td className="px-4 py-3 text-sm text-text font-medium">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.type === 'earning' ? 'bg-green-100 text-green-700' :
                        c.type === 'deduction' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {c.type?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted capitalize">{c.category?.replace('_', ' ') || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {c.calculationMethod === 'fixed' ? `Fixed` :
                       c.calculationMethod === 'percentage_of_basic' ? `${c.calculationValue}% of Basic` :
                       c.calculationMethod === 'percentage_of_gross' ? `${c.calculationValue}% of Gross` :
                       c.calculationMethod?.replace('_', ' ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.isStatutory ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {c.isStatutory ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.isTaxable ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {c.isTaxable ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(c)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payroll Configuration */}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-3">Payroll Settings</h3>
        <div className="bg-background rounded-xl border border-border p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Payroll Cycle Day</label>
              <input
                type="number"
                min={1}
                max={31}
                value={cfgCycleDay}
                onChange={(e) => setCfgCycleDay(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Payment Day</label>
              <input
                type="number"
                min={1}
                max={31}
                value={cfgPaymentDay}
                onChange={(e) => setCfgPaymentDay(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Tax Regime</label>
              <select
                value={cfgTaxRegime}
                onChange={(e) => setCfgTaxRegime(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
              >
                {TAX_REGIME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text">Provident Fund (PF)</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cfgPfEnabled}
                    onChange={(e) => setCfgPfEnabled(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-xs text-text-muted">Enabled</span>
                </label>
              </div>
              {cfgPfEnabled && (
                <div>
                  <label className="block text-xs text-text-muted mb-1">Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cfgPfRate}
                    onChange={(e) => setCfgPfRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              )}
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text">ESI</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cfgEsiEnabled}
                    onChange={(e) => setCfgEsiEnabled(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-xs text-text-muted">Enabled</span>
                </label>
              </div>
              {cfgEsiEnabled && (
                <div>
                  <label className="block text-xs text-text-muted mb-1">Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cfgEsiRate}
                    onChange={(e) => setCfgEsiRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              )}
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text">Professional Tax (PT)</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cfgPtEnabled}
                    onChange={(e) => setCfgPtEnabled(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-xs text-text-muted">Enabled</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Component Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{editing ? 'Edit Salary Component' : 'Add Salary Component'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. Basic Salary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                  >
                    {COMPONENT_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                  >
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Calculation Method</label>
                  <select
                    value={formCalculation}
                    onChange={(e) => setFormCalculation(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                  >
                    {CALCULATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCalculationValue}
                    onChange={(e) => setFormCalculationValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g. 40 for 40%"
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={formIsStatutory}
                    onChange={(e) => setFormIsStatutory(e.target.checked)}
                    className="rounded border-border"
                  />
                  Statutory
                </label>
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={formIsTaxable}
                    onChange={(e) => setFormIsTaxable(e.target.checked)}
                    className="rounded border-border"
                  />
                  Taxable
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving || !formName.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
