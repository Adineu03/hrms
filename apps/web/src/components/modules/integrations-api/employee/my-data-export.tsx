'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Download, FileText, PackageOpen } from 'lucide-react';

interface ExportRecord {
  id: string;
  status: 'completed' | 'processing' | 'failed';
  categories: string[];
  requestedAt: string;
  downloadUrl?: string;
}

const MOCK_HISTORY: ExportRecord[] = [
  { id: '1', status: 'completed', categories: ['Personal Info', 'Payslips'], requestedAt: '2026-03-05 09:00', downloadUrl: '#' },
  { id: '2', status: 'completed', categories: ['Leave History', 'Attendance Records'], requestedAt: '2026-02-20 14:30', downloadUrl: '#' },
  { id: '3', status: 'processing', categories: ['Personal Info', 'Payslips', 'Documents'], requestedAt: '2026-03-09 15:00', downloadUrl: undefined },
];

const DATA_CATEGORIES = [
  { id: 'personal_info', label: 'Personal Info' },
  { id: 'payslips', label: 'Payslips' },
  { id: 'leave_history', label: 'Leave History' },
  { id: 'attendance_records', label: 'Attendance Records' },
  { id: 'documents', label: 'Documents' },
];

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  processing: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-600',
};

export default function MyDataExport() {
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/integrations-api/employee/my-data-export/history')
      .then((res) => setHistory(res.data.data ?? MOCK_HISTORY))
      .catch(() => setHistory(MOCK_HISTORY))
      .finally(() => setLoading(false));
  }, []);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (selectedCategories.length === 0) {
      setError('Please select at least one data category.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/integrations-api/employee/my-data-export/request', {
        categories: selectedCategories,
      });
      setSuccess('Export request submitted. You will receive a download link once it is ready.');
      setSelectedCategories([]);
    } catch {
      setError('Failed to submit export request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#2c2c2c]">My Data Export</h2>

      {/* Request Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-medium text-[#2c2c2c] mb-1 flex items-center gap-2">
          <PackageOpen className="h-4 w-4 text-indigo-600" />
          Request Download
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Select the data categories you want to include in your export.
        </p>

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DATA_CATEGORIES.map((cat) => (
              <label
                key={cat.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedCategories.includes(cat.id)
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat.id)}
                  onChange={() => handleCategoryToggle(cat.id)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <FileText className={`h-4 w-4 ${selectedCategories.includes(cat.id) ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium text-[#2c2c2c]">{cat.label}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Request Export'}
            </button>
            {selectedCategories.length > 0 && (
              <span className="text-sm text-gray-500">
                {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} selected
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Export History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-medium text-[#2c2c2c]">Export History</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center">
            <Download className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No data exports requested yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Categories</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Requested At</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[record.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {record.categories.map((cat) => (
                          <span key={cat} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{record.requestedAt}</td>
                    <td className="px-4 py-3">
                      {record.downloadUrl && record.status === 'completed' ? (
                        <a
                          href={record.downloadUrl}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      ) : record.status === 'processing' ? (
                        <span className="text-xs text-yellow-600">Processing...</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
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
