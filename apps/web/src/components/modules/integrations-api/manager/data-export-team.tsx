'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Download, FileDown } from 'lucide-react';

interface ExportHistory {
  id: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  fields: string[];
  status: 'completed' | 'processing' | 'failed';
  requestedAt: string;
  downloadUrl?: string;
}

const MOCK_HISTORY: ExportHistory[] = [
  { id: '1', type: 'headcount', dateFrom: '2026-01-01', dateTo: '2026-03-01', fields: ['Employee ID', 'Name', 'Department'], status: 'completed', requestedAt: '2026-03-05 10:30', downloadUrl: '#' },
  { id: '2', type: 'attendance', dateFrom: '2026-02-01', dateTo: '2026-02-28', fields: ['Employee ID', 'Name', 'Position'], status: 'completed', requestedAt: '2026-03-01 09:15', downloadUrl: '#' },
  { id: '3', type: 'leaves', dateFrom: '2026-01-01', dateTo: '2026-03-09', fields: ['Employee ID', 'Name', 'Department', 'Position'], status: 'processing', requestedAt: '2026-03-09 14:00', downloadUrl: undefined },
];

const DATA_TYPES = ['headcount', 'attendance', 'leaves', 'performance'];
const FIELD_OPTIONS = ['Employee ID', 'Name', 'Department', 'Position'];

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  processing: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-600',
};

export default function DataExportTeam() {
  const [history, setHistory] = useState<ExportHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    dataType: 'headcount',
    dateFrom: '',
    dateTo: '',
    fields: [] as string[],
  });

  useEffect(() => {
    setLoading(true);
    api
      .get('/integrations-api/manager/data-export-team/history')
      .then((res) => setHistory(res.data.data ?? MOCK_HISTORY))
      .catch(() => setHistory(MOCK_HISTORY))
      .finally(() => setLoading(false));
  }, []);

  const handleFieldToggle = (field: string) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.includes(field)
        ? prev.fields.filter((f) => f !== field)
        : [...prev.fields, field],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.dateFrom || !form.dateTo) { setError('Please select both date range values.'); return; }
    if (form.fields.length === 0) { setError('Select at least one field.'); return; }
    setSubmitting(true);
    try {
      await api.post('/integrations-api/manager/data-export-team/export', {
        type: form.dataType,
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        fields: form.fields,
      });
      setSuccess('Export request submitted successfully. You will be notified when it is ready.');
      setForm({ dataType: 'headcount', dateFrom: '', dateTo: '', fields: [] });
    } catch {
      setError('Failed to submit export request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#2c2c2c]">Data Export for Team</h2>

      {/* Request Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-medium text-[#2c2c2c] mb-4 flex items-center gap-2">
          <FileDown className="h-4 w-4 text-indigo-600" />
          Request Export
        </h3>

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
              <select
                value={form.dataType}
                onChange={(e) => setForm((p) => ({ ...p, dataType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {DATA_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={form.dateFrom}
                onChange={(e) => setForm((p) => ({ ...p, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={form.dateTo}
                onChange={(e) => setForm((p) => ({ ...p, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fields to Include</label>
            <div className="flex flex-wrap gap-3">
              {FIELD_OPTIONS.map((field) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.fields.includes(field)}
                    onChange={() => handleFieldToggle(field)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{field}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {submitting ? 'Submitting...' : 'Request Export'}
          </button>
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date Range</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fields</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Requested At</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="capitalize font-medium text-[#2c2c2c]">{exp.type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {exp.dateFrom} — {exp.dateTo}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {exp.fields.map((f) => (
                          <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[exp.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {exp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{exp.requestedAt}</td>
                    <td className="px-4 py-3">
                      {exp.downloadUrl && exp.status === 'completed' ? (
                        <a
                          href={exp.downloadUrl}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
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
