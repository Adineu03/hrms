'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Send, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';

interface Webhook {
  id: string;
  name: string;
  eventType: string;
  endpointUrl: string;
  format: 'JSON' | 'Form';
  enabled: boolean;
  successCount: number;
  failureCount: number;
  lastDelivery: string;
}

const MOCK_WEBHOOKS: Webhook[] = [
  { id: '1', name: 'Employee Created Notifier', eventType: 'employee.created', endpointUrl: 'https://hooks.slack.com/services/T00/B00/abc123', format: 'JSON', enabled: true, successCount: 142, failureCount: 3, lastDelivery: '2026-03-09 14:32' },
  { id: '2', name: 'Leave Approval Alert', eventType: 'leave.approved', endpointUrl: 'https://api.zapier.com/hooks/catch/123456/leave', format: 'JSON', enabled: true, successCount: 87, failureCount: 0, lastDelivery: '2026-03-09 11:15' },
  { id: '3', name: 'Payroll Processed Hook', eventType: 'payroll.processed', endpointUrl: 'https://quickbooks.company.com/webhook/payroll', format: 'Form', enabled: false, successCount: 12, failureCount: 1, lastDelivery: '2026-02-28 18:00' },
  { id: '4', name: 'Attendance Sync Trigger', eventType: 'attendance.synced', endpointUrl: 'https://erp.company.com/api/attendance-hook', format: 'JSON', enabled: true, successCount: 1240, failureCount: 5, lastDelivery: '2026-03-09 08:00' },
];

const EVENT_TYPES = ['employee.created', 'leave.approved', 'payroll.processed', 'attendance.synced'];

export default function WebhookConfiguration() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [pinging, setPinging] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    eventType: 'employee.created',
    endpointUrl: '',
    secret: '',
    format: 'JSON' as 'JSON' | 'Form',
  });

  useEffect(() => {
    setLoading(true);
    api
      .get('/integrations-api/admin/webhook-configuration')
      .then((res) => setWebhooks(res.data.data ?? MOCK_WEBHOOKS))
      .catch(() => setWebhooks(MOCK_WEBHOOKS))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.endpointUrl.trim()) { setError('Endpoint URL is required.'); return; }
    try {
      await api.post('/integrations-api/admin/webhook-configuration', form);
      setSuccess('Webhook created successfully.');
      setShowForm(false);
      setForm({ name: '', eventType: 'employee.created', endpointUrl: '', secret: '', format: 'JSON' });
    } catch {
      setError('Failed to create webhook. Please try again.');
    }
  };

  const handlePing = async (id: string) => {
    setPinging(id);
    try {
      await api.post(`/integrations-api/admin/webhook-configuration/${id}/ping`);
    } catch {
      // silently fail
    } finally {
      setPinging(null);
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    try {
      await api.post(`/integrations-api/admin/webhook-configuration/${webhook.id}/toggle`, {
        enabled: !webhook.enabled,
      });
      setWebhooks((prev) =>
        prev.map((w) => (w.id === webhook.id ? { ...w, enabled: !w.enabled } : w))
      );
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/integrations-api/admin/webhook-configuration/${id}`);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch {
      // silently fail
    }
  };

  const truncate = (url: string, max = 40) =>
    url.length > max ? url.slice(0, max) + '...' : url;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#2c2c2c]">Webhook Configuration</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </button>
      </div>

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

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="font-medium text-[#2c2c2c] mb-4">Add New Webhook</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Leave Approval Alert"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={form.eventType}
                  onChange={(e) => setForm((p) => ({ ...p, eventType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {EVENT_TYPES.map((et) => (
                    <option key={et} value={et}>{et}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL *</label>
              <input
                type="url"
                value={form.endpointUrl}
                onChange={(e) => setForm((p) => ({ ...p, endpointUrl: e.target.value }))}
                placeholder="https://your-service.com/webhook"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret</label>
                <input
                  type="password"
                  value={form.secret}
                  onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))}
                  placeholder="Webhook signing secret"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payload Format</label>
                <select
                  value={form.format}
                  onChange={(e) => setForm((p) => ({ ...p, format: e.target.value as 'JSON' | 'Form' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="JSON">JSON</option>
                  <option value="Form">Form</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Create Webhook
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Event Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Endpoint URL</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Format</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Success / Fail</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Delivery</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {webhooks.map((wh) => (
                <tr key={wh.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#2c2c2c]">{wh.name}</td>
                  <td className="px-4 py-3">
                    <code className="bg-gray-100 text-xs px-2 py-0.5 rounded font-mono text-gray-700">
                      {wh.eventType}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-500 text-xs" title={wh.endpointUrl}>
                      {truncate(wh.endpointUrl)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {wh.format}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(wh)} className="flex items-center gap-1">
                      {wh.enabled ? (
                        <>
                          <ToggleRight className="h-5 w-5 text-green-500" />
                          <span className="text-xs text-green-700">Enabled</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                          <span className="text-xs text-gray-500">Disabled</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-green-600 font-medium">{wh.successCount}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-red-500 font-medium">{wh.failureCount}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{wh.lastDelivery}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePing(wh.id)}
                        disabled={pinging === wh.id}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        title="Send test ping"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {pinging === wh.id ? 'Pinging...' : 'Ping'}
                      </button>
                      <button className="text-gray-400 hover:text-gray-600" title="Edit">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(wh.id)}
                        className="text-red-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
