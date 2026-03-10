'use client';
import { useState, useEffect } from 'react';
import { Loader2, Plus, X, AlertCircle, Archive, Lock, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface RetentionConfig {
  id: string;
  entityType: string;
  retentionDays: number;
  trackCreate: boolean;
  trackUpdate: boolean;
  trackDelete: boolean;
  trackView: boolean;
  trackExport: boolean;
}

interface LegalHoldForm {
  entityType: string;
  entityId: string;
  reason: string;
}

export default function DocumentRetentionTab() {
  const [configs, setConfigs] = useState<RetentionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showRetentionForm, setShowRetentionForm] = useState(false);
  const [showLegalHoldForm, setShowLegalHoldForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [retentionForm, setRetentionForm] = useState({
    entityType: '',
    retentionDays: 2555,
    trackCreate: true,
    trackUpdate: true,
    trackDelete: true,
    trackView: false,
    trackExport: false,
  });

  const [legalHoldForm, setLegalHoldForm] = useState<LegalHoldForm>({
    entityType: '',
    entityId: '',
    reason: '',
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/compliance-audit/admin/document-retention/configs');
      setConfigs(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load retention configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRetention = async () => {
    if (!retentionForm.entityType) return;
    try {
      setSubmitting(true);
      await api.post('/compliance-audit/admin/document-retention/configs', retentionForm);
      setRetentionForm({ entityType: '', retentionDays: 2555, trackCreate: true, trackUpdate: true, trackDelete: true, trackView: false, trackExport: false });
      setShowRetentionForm(false);
      setSuccessMsg('Retention policy created');
      fetchConfigs();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to create retention policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLegalHold = async () => {
    if (!legalHoldForm.entityType || !legalHoldForm.entityId || !legalHoldForm.reason) return;
    try {
      setSubmitting(true);
      await api.post('/compliance-audit/admin/document-retention/legal-hold', legalHoldForm);
      setLegalHoldForm({ entityType: '', entityId: '', reason: '' });
      setShowLegalHoldForm(false);
      setSuccessMsg('Legal hold applied successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to apply legal hold');
    } finally {
      setSubmitting(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading retention policies...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Retention Policies */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Document Retention Policies</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLegalHoldForm(!showLegalHoldForm)}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <Lock className="w-4 h-4" />
              Apply Legal Hold
            </button>
            <button
              onClick={() => setShowRetentionForm(!showRetentionForm)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Retention Policy
            </button>
          </div>
        </div>

        {showLegalHoldForm && (
          <div className="mb-6 p-4 border border-red-100 bg-red-50 rounded-lg">
            <h3 className="text-sm font-semibold text-red-800 mb-1">Apply Legal Hold</h3>
            <p className="text-xs text-red-600 mb-3">Legal hold prevents automatic deletion of records during litigation or investigation.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Entity Type *</label>
                <input
                  type="text"
                  value={legalHoldForm.entityType}
                  onChange={(e) => setLegalHoldForm({ ...legalHoldForm, entityType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., Employee, Contract, Invoice"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Entity ID *</label>
                <input
                  type="text"
                  value={legalHoldForm.entityId}
                  onChange={(e) => setLegalHoldForm({ ...legalHoldForm, entityId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Record identifier"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason *</label>
                <textarea
                  value={legalHoldForm.reason}
                  onChange={(e) => setLegalHoldForm({ ...legalHoldForm, reason: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Reason for legal hold (e.g., pending litigation, regulatory inquiry)..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleLegalHold}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Apply Legal Hold
              </button>
              <button onClick={() => setShowLegalHoldForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {showRetentionForm && (
          <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
            <h3 className="text-sm font-semibold text-[#2c2c2c] mb-3">New Retention Policy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Entity Type *</label>
                <input
                  type="text"
                  value={retentionForm.entityType}
                  onChange={(e) => setRetentionForm({ ...retentionForm, entityType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Payroll Records, Leave Records"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Retention Period (Days)</label>
                <input
                  type="number"
                  value={retentionForm.retentionDays}
                  onChange={(e) => setRetentionForm({ ...retentionForm, retentionDays: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min={30}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-2">Track Events</label>
                <div className="flex flex-wrap gap-4">
                  {([
                    { key: 'trackCreate' as const, label: 'Create' },
                    { key: 'trackUpdate' as const, label: 'Update' },
                    { key: 'trackDelete' as const, label: 'Delete' },
                    { key: 'trackView' as const, label: 'View' },
                    { key: 'trackExport' as const, label: 'Export' },
                  ]).map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={retentionForm[key]}
                        onChange={(v) => setRetentionForm({ ...retentionForm, [key]: v })}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreateRetention}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Policy
              </button>
              <button onClick={() => setShowRetentionForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {configs.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No retention policies configured. Add your first policy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity Type</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Retention</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Create</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Update</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Delete</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">View</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {configs.map((cfg) => (
                  <tr key={cfg.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-medium text-[#2c2c2c]">{cfg.entityType}</td>
                    <td className="py-3 px-2 text-gray-600">
                      {cfg.retentionDays >= 365
                        ? `${Math.round(cfg.retentionDays / 365)} year${Math.round(cfg.retentionDays / 365) !== 1 ? 's' : ''}`
                        : `${cfg.retentionDays} days`}
                    </td>
                    {(['trackCreate', 'trackUpdate', 'trackDelete', 'trackView', 'trackExport'] as const).map((key) => (
                      <td key={key} className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg[key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {cfg[key] ? 'On' : 'Off'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
