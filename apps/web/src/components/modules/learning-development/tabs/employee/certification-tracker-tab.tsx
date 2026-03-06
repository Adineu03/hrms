'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Award,
  Plus,
  X,
  Inbox,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';

interface Certification {
  id: string;
  name: string;
  issuingBody: string;
  credentialId: string;
  issueDate: string;
  expiryDate: string;
  cpeCredits: number;
  proofUrl: string;
  status: string;
}

interface ExpiryAlert {
  id: string;
  name: string;
  expiryDate: string;
  daysUntilExpiry: number;
  urgency: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  expiring_soon: 'bg-yellow-50 text-yellow-700',
  expired: 'bg-red-100 text-red-700',
  renewed: 'bg-blue-100 text-blue-700',
};

const URGENCY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
};

const defaultFormData = {
  name: '',
  issuingBody: '',
  credentialId: '',
  issueDate: '',
  expiryDate: '',
  cpeCredits: 0,
  proofUrl: '',
};

export default function CertificationTrackerTab() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [certRes, alertRes] = await Promise.all([
        api.get('/learning-development/employee/certifications'),
        api.get('/learning-development/employee/certifications/expiry-alerts'),
      ]);
      setCertifications(Array.isArray(certRes.data) ? certRes.data : certRes.data?.data || []);
      setExpiryAlerts(Array.isArray(alertRes.data) ? alertRes.data : alertRes.data?.data || []);
    } catch {
      setError('Failed to load certifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setError(null);
    if (!formData.name.trim()) {
      setError('Certification name is required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/learning-development/employee/certifications', {
        ...formData,
        cpeCredits: Number(formData.cpeCredits) || 0,
      });
      setSuccess('Certification added successfully.');
      setShowModal(false);
      setFormData(defaultFormData);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to add certification.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading certifications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certification Tracker
        </h2>
        <p className="text-sm text-text-muted">Track your professional certifications and renewal dates.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
        </div>
      )}

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-yellow-800 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" />
            Upcoming Expiry Alerts
          </h3>
          <div className="space-y-2">
            {expiryAlerts.map((alert) => (
              <div key={alert.id} className={`flex items-center justify-between border rounded-lg px-3 py-2 bg-white ${URGENCY_STYLES[alert.urgency] || 'border-border'}`}>
                <div>
                  <span className="text-sm text-text font-medium">{alert.name}</span>
                  <p className="text-xs text-text-muted">Expires: {new Date(alert.expiryDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-text-muted" />
                    <span className={`text-xs font-medium ${alert.daysUntilExpiry <= 30 ? 'text-red-600' : alert.daysUntilExpiry <= 60 ? 'text-yellow-600' : 'text-blue-600'}`}>
                      {alert.daysUntilExpiry} days
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => { setFormData(defaultFormData); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Certification
        </button>
      </div>

      {/* Certifications Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Certification</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Issuing Body</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Credential ID</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Issue Date</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Expiry Date</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">CPE Credits</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Proof</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {certifications.map((cert) => (
              <tr key={cert.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm text-text font-medium">{cert.name}</span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{cert.issuingBody || '--'}</td>
                <td className="px-4 py-3 text-sm text-text-muted font-mono text-xs">{cert.credentialId || '--'}</td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : '--'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'No Expiry'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{cert.cpeCredits || '--'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[cert.status] || 'bg-gray-100 text-gray-600'}`}>
                    {cert.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {cert.proofUrl ? (
                    <a href={cert.proofUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-text-muted">--</span>
                  )}
                </td>
              </tr>
            ))}
            {certifications.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No certifications tracked yet. Add your first certification.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Certification Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Add Certification</h3>
              <button type="button" onClick={() => { setShowModal(false); setFormData(defaultFormData); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Certification Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClassName} placeholder="e.g. AWS Solutions Architect" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Issuing Body</label>
                <input type="text" value={formData.issuingBody} onChange={(e) => setFormData({ ...formData, issuingBody: e.target.value })} className={inputClassName} placeholder="e.g. Amazon Web Services" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Credential ID</label>
                <input type="text" value={formData.credentialId} onChange={(e) => setFormData({ ...formData, credentialId: e.target.value })} className={inputClassName} placeholder="Certificate credential ID" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Issue Date</label>
                  <input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Expiry Date</label>
                  <input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className={inputClassName} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">CPE Credits</label>
                <input type="number" value={formData.cpeCredits} onChange={(e) => setFormData({ ...formData, cpeCredits: parseInt(e.target.value) || 0 })} className={inputClassName} min={0} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Proof URL</label>
                <input type="url" value={formData.proofUrl} onChange={(e) => setFormData({ ...formData, proofUrl: e.target.value })} className={inputClassName} placeholder="https://..." />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Certification
              </button>
              <button type="button" onClick={() => { setShowModal(false); setFormData(defaultFormData); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
