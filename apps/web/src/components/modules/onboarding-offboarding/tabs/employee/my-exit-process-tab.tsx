'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  DoorOpen,
  Inbox,
  FileText,
  Package,
  DollarSign,
  Download,
  Send,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';

interface ClearanceItem {
  id: string;
  department: string;
  status: string;
  signedBy: string | null;
  signedDate: string | null;
}

interface AssetReturn {
  id: string;
  assetName: string;
  status: string;
  returnDate: string | null;
}

interface SettlementEstimate {
  leaveEncashment: number;
  gratuity: number;
  noticePay: number;
  bonusDues: number;
  deductions: number;
  netPayable: number;
}

interface DownloadableDoc {
  id: string;
  name: string;
  type: string;
  available: boolean;
  url: string | null;
}

interface ExitProcess {
  hasActiveExit: boolean;
  resignationDate: string | null;
  lastWorkingDate: string | null;
  exitType: string | null;
  status: string;
  clearanceItems: ClearanceItem[];
  assetReturns: AssetReturn[];
  settlement: SettlementEstimate | null;
  documents: DownloadableDoc[];
}

const CLEARANCE_STYLES: Record<string, string> = {
  signed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
};

const ASSET_STYLES: Record<string, string> = {
  returned: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  not_applicable: 'bg-gray-100 text-gray-600',
};

export default function MyExitProcessTab() {
  const [exitProcess, setExitProcess] = useState<ExitProcess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showResignForm, setShowResignForm] = useState(false);
  const [resignData, setResignData] = useState({ reason: '', lastWorkingDate: '' });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/onboarding-offboarding/employee/my-exit').catch(() => ({ data: null }));
      const data = res.data?.data || res.data;
      setExitProcess(data && typeof data === 'object' ? data : null);
    } catch {
      setError('Failed to load exit process.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitResignation = async () => {
    setError(null);
    if (!resignData.lastWorkingDate) {
      setError('Last working date is required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/onboarding-offboarding/employee/my-exit/resign', resignData);
      setSuccess('Resignation submitted successfully.');
      setShowResignForm(false);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit resignation.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading exit process...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <DoorOpen className="h-5 w-5" />
          My Exit Process
        </h2>
        <p className="text-sm text-text-muted">Manage your exit process, clearances, and asset returns.</p>
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

      {!exitProcess?.hasActiveExit ? (
        <div className="space-y-4">
          <div className="text-center py-8">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted mb-4">No active exit process.</p>
            <button
              type="button"
              onClick={() => setShowResignForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <Send className="h-4 w-4" />
              Submit Resignation
            </button>
          </div>

          {/* Resignation Form */}
          {showResignForm && (
            <div className="bg-card border border-border rounded-xl p-5 max-w-lg mx-auto">
              <h3 className="text-sm font-semibold text-text mb-4">Submit Resignation</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Reason</label>
                  <textarea
                    value={resignData.reason}
                    onChange={(e) => setResignData({ ...resignData, reason: e.target.value })}
                    className={`${inputClassName} min-h-[80px]`}
                    placeholder="Reason for resignation..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Proposed Last Working Date *</label>
                  <input
                    type="date"
                    value={resignData.lastWorkingDate}
                    onChange={(e) => setResignData({ ...resignData, lastWorkingDate: e.target.value })}
                    className={inputClassName}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={handleSubmitResignation} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit
                  </button>
                  <button type="button" onClick={() => setShowResignForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Exit Status Summary */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-xs text-text-muted block">Resignation Date</span>
                <span className="text-sm font-medium text-text">{exitProcess.resignationDate ? new Date(exitProcess.resignationDate).toLocaleDateString() : '--'}</span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">Last Working Day</span>
                <span className="text-sm font-medium text-text">{exitProcess.lastWorkingDate ? new Date(exitProcess.lastWorkingDate).toLocaleDateString() : '--'}</span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">Exit Type</span>
                <span className="text-sm font-medium text-text capitalize">{exitProcess.exitType?.replace(/_/g, ' ') || '--'}</span>
              </div>
              <div>
                <span className="text-xs text-text-muted block">Status</span>
                <span className="text-sm font-medium text-primary capitalize">{exitProcess.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Clearance Tracker */}
          <div>
            <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4" />
              Department Clearances
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(exitProcess.clearanceItems || []).map((item) => (
                <div key={item.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-text font-medium">{item.department}</span>
                    {item.signedBy && <p className="text-[10px] text-text-muted">By: {item.signedBy}</p>}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CLEARANCE_STYLES[item.status] || 'bg-gray-100 text-gray-600'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Asset Return Checklist */}
          <div>
            <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
              <Package className="h-4 w-4" />
              Asset Return Checklist
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(exitProcess.assetReturns || []).map((asset) => (
                <div key={asset.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-text">{asset.assetName}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ASSET_STYLES[asset.status] || 'bg-gray-100 text-gray-600'}`}>
                    {asset.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Settlement Estimate */}
          {exitProcess.settlement && (
            <div>
              <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4" />
                Settlement Estimate
              </h3>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Leave Encashment</span>
                    <span className="text-text font-medium">${exitProcess.settlement.leaveEncashment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Gratuity</span>
                    <span className="text-text font-medium">${exitProcess.settlement.gratuity.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Notice Pay</span>
                    <span className="text-text font-medium">${exitProcess.settlement.noticePay.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Bonus Dues</span>
                    <span className="text-text font-medium">${exitProcess.settlement.bonusDues.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Deductions</span>
                    <span className="text-red-600 font-medium">-${exitProcess.settlement.deductions.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                    <span className="text-text">Net Payable</span>
                    <span className="text-primary">${exitProcess.settlement.netPayable.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Downloadable Documents */}
          {(exitProcess.documents || []).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
                <Download className="h-4 w-4" />
                Download Letters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {exitProcess.documents.map((doc) => (
                  <div key={doc.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-text">{doc.name}</span>
                    {doc.available && doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    ) : (
                      <span className="text-xs text-text-muted">Not available</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
