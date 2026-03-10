'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, AlertCircle, Shield, Download, Edit, Trash2, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '@/lib/api';

interface DataCategory {
  id: string;
  name: string;
  description: string;
  recordCount: number;
  lastUpdated: string;
  icon: string;
}

interface ConsentSettings {
  marketing: boolean;
  analytics: boolean;
  thirdParty: boolean;
}

interface CorrectionForm {
  field: string;
  currentValue: string;
  requestedValue: string;
  reason: string;
}

const dataCategories: DataCategory[] = [
  { id: 'personal', name: 'Personal Information', description: 'Name, address, contact details, emergency contacts', recordCount: 0, lastUpdated: '', icon: '👤' },
  { id: 'employment', name: 'Employment Data', description: 'Job title, department, hire date, performance records', recordCount: 0, lastUpdated: '', icon: '💼' },
  { id: 'payroll', name: 'Payroll Data', description: 'Salary, tax information, bank details, pay slips', recordCount: 0, lastUpdated: '', icon: '💰' },
  { id: 'attendance', name: 'Attendance Data', description: 'Clock-in/out records, leave records, overtime', recordCount: 0, lastUpdated: '', icon: '📅' },
];

export default function DataPrivacyControlsTab() {
  const [myData, setMyData] = useState<DataCategory[]>(dataCategories);
  const [consent, setConsent] = useState<ConsentSettings>({ marketing: false, analytics: true, thirdParty: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeSection, setActiveSection] = useState<'my-data' | 'correction' | 'consent' | 'deletion'>('my-data');
  const [submitting, setSubmitting] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);

  const [correctionForm, setCorrectionForm] = useState<CorrectionForm>({
    field: '',
    currentValue: '',
    requestedValue: '',
    reason: '',
  });

  const [deletionReason, setDeletionReason] = useState('');
  const [deletionConfirmed, setDeletionConfirmed] = useState(false);

  useEffect(() => {
    fetchMyData();
  }, []);

  const fetchMyData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/compliance-audit/employee/data-privacy/my-data');
      const serverData = res.data?.data || res.data;
      if (Array.isArray(serverData)) {
        setMyData(serverData);
      } else if (serverData && typeof serverData === 'object') {
        // merge with default categories
        setMyData(dataCategories.map((cat) => ({
          ...cat,
          ...(serverData[cat.id] || {}),
        })));
      }
    } catch {
      // Use default categories on error
    } finally {
      setLoading(false);
    }
  };

  const handleExportRequest = async () => {
    try {
      setSubmitting(true);
      await api.post('/compliance-audit/employee/data-privacy/data-export');
      setExportRequested(true);
      setSuccessMsg('Data export requested. You will receive an email with your data within 72 hours.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch {
      setError('Failed to request data export');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCorrectionRequest = async () => {
    if (!correctionForm.field || !correctionForm.requestedValue || !correctionForm.reason) return;
    try {
      setSubmitting(true);
      await api.post('/compliance-audit/employee/data-privacy/correction-request', correctionForm);
      setCorrectionForm({ field: '', currentValue: '', requestedValue: '', reason: '' });
      setSuccessMsg('Correction request submitted. HR will review your request within 5 business days.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch {
      setError('Failed to submit correction request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConsentUpdate = async (key: keyof ConsentSettings, value: boolean) => {
    const updated = { ...consent, [key]: value };
    setConsent(updated);
    try {
      await api.post('/compliance-audit/employee/data-privacy/consent', updated);
      setSuccessMsg('Consent preferences updated');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setConsent(consent); // revert
      setError('Failed to update consent');
    }
  };

  const handleDeletionRequest = async () => {
    if (!deletionReason || !deletionConfirmed) return;
    try {
      setSubmitting(true);
      await api.post('/compliance-audit/employee/data-privacy/deletion-request', { reason: deletionReason });
      setSuccessMsg('Account deletion request submitted. HR and Legal will review your request and contact you within 10 business days.');
      setDeletionReason('');
      setDeletionConfirmed(false);
      setTimeout(() => setSuccessMsg(''), 8000);
    } catch {
      setError('Failed to submit deletion request');
    } finally {
      setSubmitting(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading your data...</span>
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveSection('my-data')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'my-data' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            My Data
          </button>
          <button
            onClick={() => setActiveSection('correction')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'correction' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Request Correction
          </button>
          <button
            onClick={() => setActiveSection('consent')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'consent' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Consent Settings
          </button>
          <button
            onClick={() => setActiveSection('deletion')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'deletion' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Account Deletion
          </button>
        </div>

        {activeSection === 'my-data' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#2c2c2c]">Data We Hold About You</h3>
              <button
                onClick={handleExportRequest}
                disabled={submitting || exportRequested}
                className="flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {exportRequested ? 'Export Requested' : 'Request My Data Export'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myData.map((category) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <p className="font-medium text-[#2c2c2c]">{category.name}</p>
                      {category.recordCount > 0 && (
                        <p className="text-xs text-gray-500">{category.recordCount} records</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{category.description}</p>
                  {category.lastUpdated && (
                    <p className="text-xs text-gray-400 mt-2">Last updated: {new Date(category.lastUpdated).toLocaleDateString()}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'correction' && (
          <div>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-2">Request Data Correction</h3>
            <p className="text-sm text-gray-500 mb-4">If you believe any of your data is incorrect, submit a correction request. HR will review and update within 5 business days.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Name *</label>
                <input
                  type="text"
                  value={correctionForm.field}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, field: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Home Address, Date of Birth, Emergency Contact"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Value (as shown)</label>
                <input
                  type="text"
                  value={correctionForm.currentValue}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, currentValue: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="What is currently on record"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested Value *</label>
                <input
                  type="text"
                  value={correctionForm.requestedValue}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, requestedValue: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="What it should be changed to"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Explain why this correction is needed..."
                />
              </div>
              <button
                onClick={handleCorrectionRequest}
                disabled={submitting || !correctionForm.field || !correctionForm.requestedValue || !correctionForm.reason}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                Submit Correction Request
              </button>
            </div>
          </div>
        )}

        {activeSection === 'consent' && (
          <div>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-2">Consent Preferences</h3>
            <p className="text-sm text-gray-500 mb-4">Control how your data is used beyond essential employment purposes.</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                <div>
                  <p className="font-medium text-[#2c2c2c] text-sm">Marketing Communications</p>
                  <p className="text-xs text-gray-500">Receive company newsletters, events and announcements</p>
                </div>
                <ToggleSwitch
                  checked={consent.marketing}
                  onChange={(v) => handleConsentUpdate('marketing', v)}
                />
              </div>
              <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                <div>
                  <p className="font-medium text-[#2c2c2c] text-sm">Analytics & Improvement</p>
                  <p className="text-xs text-gray-500">Allow anonymized data to improve HR processes and tools</p>
                </div>
                <ToggleSwitch
                  checked={consent.analytics}
                  onChange={(v) => handleConsentUpdate('analytics', v)}
                />
              </div>
              <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                <div>
                  <p className="font-medium text-[#2c2c2c] text-sm">Third-Party Sharing</p>
                  <p className="text-xs text-gray-500">Share data with authorized third-party benefit providers</p>
                </div>
                <ToggleSwitch
                  checked={consent.thirdParty}
                  onChange={(v) => handleConsentUpdate('thirdParty', v)}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <Shield className="w-4 h-4 inline mr-1" />
                Core employment data processing does not require consent and cannot be opted out of while employed.
              </div>
            </div>
          </div>
        )}

        {activeSection === 'deletion' && (
          <div>
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <Trash2 className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Account Deletion Request</p>
                <p className="text-xs text-red-700">This is an irreversible action. Please read the consequences before proceeding.</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-[#2c2c2c] mb-2">Consequences of account deletion:</p>
              <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
                <li>Your access to the HRMS platform will be immediately revoked</li>
                <li>Payroll data required for legal compliance may be retained for up to 7 years</li>
                <li>Your employment records may need to be preserved for regulatory purposes</li>
                <li>This request will trigger an offboarding process if you are still employed</li>
                <li>You will be contacted by HR to discuss and verify this request</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Deletion *</label>
                <textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Please explain why you are requesting account deletion..."
                />
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="deleteConfirm"
                  checked={deletionConfirmed}
                  onChange={(e) => setDeletionConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="deleteConfirm" className="text-sm text-gray-700">
                  I understand that this request is irreversible and I have read the consequences above.
                </label>
              </div>
              <button
                onClick={handleDeletionRequest}
                disabled={submitting || !deletionReason || !deletionConfirmed}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Request Account Deletion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
