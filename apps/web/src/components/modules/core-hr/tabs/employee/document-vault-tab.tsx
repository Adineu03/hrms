'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Upload,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Tag,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

const CATEGORIES = ['All', 'Identity', 'Financial', 'Contracts', 'Certificates', 'Letters'] as const;

type Category = (typeof CATEGORIES)[number];

const CATEGORY_STYLES: Record<string, string> = {
  Identity: 'bg-blue-50 text-blue-700',
  Financial: 'bg-green-50 text-green-700',
  Contracts: 'bg-purple-50 text-purple-700',
  Certificates: 'bg-orange-50 text-orange-700',
  Letters: 'bg-indigo-50 text-indigo-700',
};

interface Document {
  id: string;
  name: string;
  category: string;
  description: string;
  fileUrl: string;
  expiryDate: string | null;
  verified: boolean;
  createdAt: string;
}

interface ExpiringDocument {
  id: string;
  name: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

export default function DocumentVaultTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDocument[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'Identity',
    description: '',
    expiryDate: '',
    fileUrl: '',
  });

  useEffect(() => {
    fetchDocuments();
    fetchExpiringDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/core-hr/employee/documents');
      setDocuments(res.data);
    } catch {
      setError('Failed to load documents.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExpiringDocuments = async () => {
    try {
      const res = await api.get('/core-hr/employee/documents/expiring');
      setExpiringDocs(res.data);
    } catch {
      // Non-critical
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!uploadForm.name.trim() || !uploadForm.fileUrl.trim()) {
      setError('Name and file URL are required.');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      await api.post('/core-hr/employee/documents', {
        name: uploadForm.name.trim(),
        category: uploadForm.category,
        description: uploadForm.description.trim(),
        expiryDate: uploadForm.expiryDate || null,
        fileUrl: uploadForm.fileUrl.trim(),
      });
      setSuccessMessage('Document uploaded successfully.');
      setUploadForm({ name: '', category: 'Identity', description: '', expiryDate: '', fileUrl: '' });
      setShowUploadForm(false);
      fetchDocuments();
      fetchExpiringDocuments();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/core-hr/employee/documents/${id}`);
      setDocuments(documents.filter((d) => d.id !== id));
      setDeletingId(null);
      setSuccessMessage('Document deleted.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to delete document.');
    }
  };

  const filteredDocuments =
    activeCategory === 'All'
      ? documents
      : documents.filter((d) => d.category === activeCategory);

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const days = Math.ceil(
      (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return days <= 30 && days >= 0;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate).getTime() < Date.now();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Expiring Documents Alert */}
      {expiringDocs.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <h3 className="text-sm font-semibold text-yellow-800">Documents Expiring Soon</h3>
          </div>
          <div className="space-y-1">
            {expiringDocs.map((doc) => (
              <p key={doc.id} className="text-sm text-yellow-700">
                <span className="font-medium">{doc.name}</span> expires in{' '}
                {doc.daysUntilExpiry} day{doc.daysUntilExpiry !== 1 ? 's' : ''} (
                {new Date(doc.expiryDate).toLocaleDateString()})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Status Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Header with Upload Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">My Documents</h3>
        <button
          type="button"
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Document
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <form
          onSubmit={handleUpload}
          className="border border-border rounded-lg p-4 space-y-4 bg-background"
        >
          <h4 className="text-sm font-semibold text-text">Upload New Document</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Document Name *
              </label>
              <input
                type="text"
                required
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                placeholder="e.g. Passport"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Category</label>
              <select
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                className={`${selectClassName} text-sm`}
              >
                {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Description <span className="font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              placeholder="Brief description"
              className={`${inputClassName} text-sm`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Expiry Date <span className="font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={uploadForm.expiryDate}
                onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })}
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                File URL *
              </label>
              <input
                type="url"
                required
                value={uploadForm.fileUrl}
                onChange={(e) => setUploadForm({ ...uploadForm, fileUrl: e.target.value })}
                placeholder="https://storage.example.com/file.pdf"
                className={`${inputClassName} text-sm`}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Category Filter Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text hover:border-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document Cards */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            {activeCategory === 'All'
              ? 'No documents uploaded yet.'
              : `No ${activeCategory.toLowerCase()} documents found.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="border border-border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-text truncate">{doc.name}</h4>
                  {doc.description && (
                    <p className="text-xs text-text-muted mt-0.5 truncate">{doc.description}</p>
                  )}
                </div>
                {deletingId === doc.id ? (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="px-2 py-1 text-xs rounded border border-border text-text hover:bg-background transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeletingId(doc.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors ml-2"
                    title="Delete document"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    CATEGORY_STYLES[doc.category] || 'bg-background text-text-muted'
                  }`}
                >
                  <Tag className="h-3 w-3" />
                  {doc.category}
                </span>
                {doc.verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>

              {doc.expiryDate && (
                <div
                  className={`flex items-center gap-1.5 text-xs ${
                    isExpired(doc.expiryDate)
                      ? 'text-red-600'
                      : isExpiringSoon(doc.expiryDate)
                        ? 'text-yellow-600'
                        : 'text-text-muted'
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  {isExpired(doc.expiryDate) ? (
                    <span className="font-medium">
                      Expired on {new Date(doc.expiryDate).toLocaleDateString()}
                    </span>
                  ) : isExpiringSoon(doc.expiryDate) ? (
                    <span className="font-medium">
                      Expires {new Date(doc.expiryDate).toLocaleDateString()}
                    </span>
                  ) : (
                    <span>Expires {new Date(doc.expiryDate).toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
