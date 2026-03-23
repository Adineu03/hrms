'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  Inbox,
  FileText,
  X,
  Eye,
} from 'lucide-react';

interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  status: string;
  uploadedAt: string | null;
  rejectionReason: string | null;
  fileUrl: string | null;
  isMandatory: boolean;
}

interface PolicyAck {
  id: string;
  policyName: string;
  description: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

const DOC_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  uploaded: 'bg-blue-100 text-blue-700',
  verified: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function DocumentSubmissionTab() {
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [policies, setPolicies] = useState<PolicyAck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [docRes, policyRes] = await Promise.all([
        api.get('/onboarding-offboarding/employee/documents').catch(() => ({ data: [] })),
        api.get('/onboarding-offboarding/employee/documents/offer-letter').catch(() => ({ data: [] })),
      ]);
      const docData = docRes.data;
      setDocuments(Array.isArray(docData) ? docData : Array.isArray(docData?.data) ? docData.data : []);
      const polData = policyRes.data;
      setPolicies(Array.isArray(polData) ? polData : Array.isArray(polData?.data) ? polData.data : []);
    } catch {
      setError('Failed to load documents.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = (docId: string) => {
    setSelectedDocId(docId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDocId) return;

    setUploadingDocId(selectedDocId);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/onboarding-offboarding/employee/documents/${selectedDocId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Document uploaded successfully.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to upload document.');
    } finally {
      setUploadingDocId(null);
      setSelectedDocId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAcknowledgePolicy = async (policyId: string) => {
    setError(null);
    try {
      await api.post('/onboarding-offboarding/employee/documents/policy-acknowledgement', { policyId });
      setSuccess('Policy acknowledged.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to acknowledge policy.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Document Submission
        </h2>
        <p className="text-sm text-text-muted">Upload required documents and acknowledge company policies.</p>
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

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />

      {/* Required Documents */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Required Documents</h3>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-text-muted mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text">{doc.name}</span>
                    {doc.isMandatory && (
                      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Required</span>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${DOC_STATUS_STYLES[doc.status] || 'bg-gray-100 text-gray-600'}`}>
                      {doc.status}
                    </span>
                  </div>
                  {doc.description && <p className="text-xs text-text-muted mt-0.5">{doc.description}</p>}
                  {doc.rejectionReason && (
                    <p className="text-xs text-red-600 mt-0.5">Rejection reason: {doc.rejectionReason}</p>
                  )}
                  {doc.uploadedAt && (
                    <p className="text-[10px] text-text-muted mt-0.5">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                {doc.fileUrl && (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-text-muted hover:text-primary transition-colors"
                    title="View uploaded file"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
                {(doc.status === 'pending' || doc.status === 'rejected') && (
                  <button
                    type="button"
                    onClick={() => handleUpload(doc.id)}
                    disabled={uploadingDocId === doc.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                  >
                    {uploadingDocId === doc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload
                  </button>
                )}
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <div className="text-center py-6">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted">No documents required at this time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Policy Acknowledgements */}
      {policies.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text mb-3">Policy Acknowledgements</h3>
          <div className="space-y-3">
            {policies.map((policy) => (
              <div key={policy.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-text">{policy.policyName}</span>
                  {policy.description && <p className="text-xs text-text-muted mt-0.5">{policy.description}</p>}
                  {policy.acknowledgedAt && (
                    <p className="text-[10px] text-green-600 mt-0.5">Acknowledged on {new Date(policy.acknowledgedAt).toLocaleDateString()}</p>
                  )}
                </div>
                {policy.acknowledged ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 ml-3" />
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAcknowledgePolicy(policy.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors ml-3 flex-shrink-0"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
