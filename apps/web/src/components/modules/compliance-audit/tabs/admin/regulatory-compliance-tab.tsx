'use client';
import { useState, useEffect } from 'react';
import { Loader2, Plus, X, AlertCircle, Scale, CheckCircle, Calendar, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

interface ComplianceChecklist {
  id: string;
  title: string;
  jurisdiction: string;
  category: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assignedTo?: string;
  frequency: string;
  description?: string;
}

interface CalendarItem {
  id: string;
  title: string;
  dueDate: string;
  jurisdiction: string;
  category: string;
  daysUntilDue: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
};

const jurisdictionColors: Record<string, string> = {
  india: 'bg-orange-100 text-orange-700',
  eu: 'bg-blue-100 text-blue-700',
  us: 'bg-indigo-100 text-indigo-700',
  uk: 'bg-purple-100 text-purple-700',
  global: 'bg-teal-100 text-teal-700',
};

const frequencyOptions = ['daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'one_time'];

export default function RegulatoryComplianceTab() {
  const [checklists, setChecklists] = useState<ComplianceChecklist[]>([]);
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<'checklists' | 'calendar'>('checklists');

  const [form, setForm] = useState({
    title: '',
    jurisdiction: 'india',
    category: '',
    description: '',
    dueDate: '',
    frequency: 'monthly',
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [checkRes, calRes] = await Promise.all([
        api.get('/compliance-audit/admin/regulatory/checklists'),
        api.get('/compliance-audit/admin/regulatory/calendar'),
      ]);
      setChecklists(checkRes.data?.data || checkRes.data || []);
      setCalendar(calRes.data?.data || calRes.data || []);
    } catch {
      setError('Failed to load regulatory compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title) return;
    try {
      setSubmitting(true);
      await api.post('/compliance-audit/admin/regulatory/checklists', form);
      setForm({ title: '', jurisdiction: 'india', category: '', description: '', dueDate: '', frequency: 'monthly' });
      setShowForm(false);
      fetchAll();
    } catch {
      setError('Failed to create checklist');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.patch(`/compliance-audit/admin/regulatory/checklists/${id}/complete`);
      fetchAll();
    } catch {
      setError('Failed to mark complete');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/compliance-audit/admin/regulatory/checklists/${id}`);
      fetchAll();
    } catch {
      setError('Failed to delete checklist');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading regulatory data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSection('checklists')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'checklists' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Compliance Checklists
            </button>
            <button
              onClick={() => setActiveSection('calendar')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Filing Calendar
            </button>
          </div>
          {activeSection === 'checklists' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Checklist
            </button>
          )}
        </div>

        {activeSection === 'checklists' && (
          <>
            {showForm && (
              <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
                <h3 className="text-sm font-semibold text-[#2c2c2c] mb-3">New Compliance Checklist</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Quarterly PF Filing"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Jurisdiction</label>
                    <select
                      value={form.jurisdiction}
                      onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {['india', 'eu', 'us', 'uk', 'global'].map((j) => (
                        <option key={j} value={j}>{j.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Tax, Labor, Data Protection"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
                    <select
                      value={form.frequency}
                      onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {frequencyOptions.map((f) => (
                        <option key={f} value={f}>{f.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Brief description..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleCreate}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Checklist
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {checklists.length === 0 ? (
              <div className="text-center py-12">
                <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No compliance checklists found. Add your first checklist.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jurisdiction</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Frequency</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned To</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {checklists.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 font-medium text-[#2c2c2c]">{item.title}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${jurisdictionColors[item.jurisdiction] || 'bg-gray-100 text-gray-700'}`}>
                            {item.jurisdiction.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-600">{item.category || '—'}</td>
                        <td className="py-3 px-2 text-gray-600 text-xs">
                          {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-2 text-gray-600 text-xs capitalize">{item.frequency.replace('_', ' ')}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                            {statusLabels[item.status]}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-600">{item.assignedTo || '—'}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            {item.status !== 'completed' && (
                              <button
                                onClick={() => handleComplete(item.id)}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Done
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeSection === 'calendar' && (
          <>
            <h3 className="text-base font-semibold text-[#2c2c2c] mb-3">Upcoming Filing Deadlines</h3>
            {calendar.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No upcoming filing deadlines found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {calendar.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${item.daysUntilDue <= 7 ? 'bg-red-50' : item.daysUntilDue <= 30 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                        <Calendar className={`w-4 h-4 ${item.daysUntilDue <= 7 ? 'text-red-600' : item.daysUntilDue <= 30 ? 'text-yellow-600' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-[#2c2c2c] text-sm">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.category} — {item.jurisdiction.toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#2c2c2c]">{new Date(item.dueDate).toLocaleDateString()}</p>
                      <p className={`text-xs ${item.daysUntilDue <= 7 ? 'text-red-600' : item.daysUntilDue <= 30 ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {item.daysUntilDue === 0 ? 'Due today' : item.daysUntilDue < 0 ? `${Math.abs(item.daysUntilDue)} days overdue` : `${item.daysUntilDue} days left`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
