'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Flower2,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

interface WellnessProgram {
  id: string;
  name: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  maxParticipants: number;
  participantsCount: number;
  status: string;
  createdAt: string;
}

const PROGRAM_TYPES = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'mental-health', label: 'Mental Health' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'financial', label: 'Financial Wellness' },
  { value: 'social', label: 'Social Wellness' },
  { value: 'ergonomics', label: 'Ergonomics' },
];

export default function WellnessProgramManagementTab() {
  const [programs, setPrograms] = useState<WellnessProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WellnessProgram | null>(null);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('fitness');
  const [formDescription, setFormDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formMaxParticipants, setFormMaxParticipants] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/engagement-culture/admin/wellness');
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setPrograms(data);
    } catch {
      setError('Failed to load wellness programs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormType('fitness');
    setFormDescription('');
    setFormStartDate('');
    setFormEndDate('');
    setFormBudget('');
    setFormMaxParticipants('');
    setShowModal(true);
  };

  const openEdit = (p: WellnessProgram) => {
    setEditing(p);
    setFormName(p.name);
    setFormType(p.type);
    setFormDescription(p.description || '');
    setFormStartDate(p.startDate ? p.startDate.slice(0, 10) : '');
    setFormEndDate(p.endDate ? p.endDate.slice(0, 10) : '');
    setFormBudget(String(p.budget || ''));
    setFormMaxParticipants(String(p.maxParticipants || ''));
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;
    try {
      setSaving(true);
      setError('');
      const payload = {
        name: formName.trim(),
        type: formType,
        description: formDescription.trim(),
        startDate: formStartDate || null,
        endDate: formEndDate || null,
        budget: parseFloat(formBudget) || 0,
        maxParticipants: parseInt(formMaxParticipants) || 0,
      };
      if (editing) {
        await api.patch(`/engagement-culture/admin/wellness/${editing.id}`, payload);
        setSuccess('Wellness program updated successfully.');
      } else {
        await api.post('/engagement-culture/admin/wellness', payload);
        setSuccess('Wellness program created successfully.');
      }
      setShowModal(false);
      loadData();
    } catch {
      setError('Failed to save wellness program.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this program?')) return;
    try {
      setError('');
      await api.delete(`/engagement-culture/admin/wellness/${id}`);
      setSuccess('Wellness program deleted.');
      loadData();
    } catch {
      setError('Failed to delete wellness program.');
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      fitness: 'bg-green-100 text-green-700',
      'mental-health': 'bg-purple-100 text-purple-700',
      nutrition: 'bg-orange-100 text-orange-700',
      financial: 'bg-blue-100 text-blue-700',
      social: 'bg-pink-100 text-pink-700',
      ergonomics: 'bg-yellow-100 text-yellow-700',
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Flower2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Wellness Program Management</h2>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Add Program
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {programs.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No wellness programs configured yet.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Dates</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Budget</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Participants</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {programs.map((p) => (
                <tr key={p.id} className="hover:bg-background/50">
                  <td className="px-4 py-3 text-sm text-text font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(p.type)}`}>
                      {p.type.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'} — {p.endDate ? new Date(p.endDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text">{formatCurrency(p.budget || 0)}</td>
                  <td className="px-4 py-3 text-sm text-text">
                    {p.participantsCount || 0}{p.maxParticipants ? ` / ${p.maxParticipants}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">{editing ? 'Edit Wellness Program' : 'Create Wellness Program'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g. Fitness Challenge 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                >
                  {PROGRAM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Describe the wellness program"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">End Date</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Budget</label>
                  <input
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Max Participants</label>
                  <input
                    type="number"
                    value={formMaxParticipants}
                    onChange={(e) => setFormMaxParticipants(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g. 100 (0 = unlimited)"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-muted border border-border rounded-lg hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving || !formName.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
