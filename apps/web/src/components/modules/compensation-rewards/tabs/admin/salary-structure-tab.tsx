'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

interface SalaryComponent {
  name: string;
  type: 'earning' | 'deduction';
  calculationType: 'fixed' | 'percentage';
  value: number;
  isStatutory: boolean;
}

interface SalaryStructure {
  id: string;
  name: string;
  description: string;
  components: SalaryComponent[];
  status: string;
  createdAt: string;
}

const defaultComponent: SalaryComponent = {
  name: '',
  type: 'earning',
  calculationType: 'fixed',
  value: 0,
  isStatutory: false,
};

export default function SalaryStructureTab() {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SalaryStructure | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formComponents, setFormComponents] = useState<SalaryComponent[]>([{ ...defaultComponent }]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/compensation-rewards/admin/salary-structure');
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setStructures(data);
    } catch {
      setError('Failed to load salary structures.');
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
    setFormDescription('');
    setFormComponents([{ ...defaultComponent }]);
    setShowModal(true);
  };

  const openEdit = (s: SalaryStructure) => {
    setEditing(s);
    setFormName(s.name);
    setFormDescription(s.description);
    setFormComponents(s.components?.length ? s.components.map((c) => ({ ...c })) : [{ ...defaultComponent }]);
    setShowModal(true);
  };

  const addComponent = () => {
    setFormComponents([...formComponents, { ...defaultComponent }]);
  };

  const removeComponent = (idx: number) => {
    setFormComponents(formComponents.filter((_, i) => i !== idx));
  };

  const updateComponent = (idx: number, field: keyof SalaryComponent, value: string | number | boolean) => {
    const updated = [...formComponents];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormComponents(updated);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;
    try {
      setSaving(true);
      setError('');
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        components: formComponents.filter((c) => c.name.trim()),
      };
      if (editing) {
        await api.patch(`/compensation-rewards/admin/salary-structure/${editing.id}`, payload);
        setSuccess('Salary structure updated successfully.');
      } else {
        await api.post('/compensation-rewards/admin/salary-structure', payload);
        setSuccess('Salary structure created successfully.');
      }
      setShowModal(false);
      loadData();
    } catch {
      setError('Failed to save salary structure.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary structure?')) return;
    try {
      setError('');
      await api.delete(`/compensation-rewards/admin/salary-structure/${id}`);
      setSuccess('Salary structure deleted.');
      loadData();
    } catch {
      setError('Failed to delete salary structure.');
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

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
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-text">Salary Structure Configuration</h2>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Add Structure
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

      {structures.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="h-10 w-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">No salary structures configured yet.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Description</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Components Count</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {structures.map((s) => (
                <tr key={s.id} className="hover:bg-background/50">
                  <td className="px-4 py-3 text-sm text-text font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{s.description || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text">{s.components?.length || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(s)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1 text-text-muted hover:text-red-600 transition-colors" title="Delete">
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
              <h3 className="text-lg font-semibold text-text">{editing ? 'Edit Salary Structure' : 'Create Salary Structure'}</h3>
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
                  placeholder="e.g. Standard CTC Structure"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Description of this salary structure"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-text">Components</label>
                  <button onClick={addComponent} className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Component
                  </button>
                </div>
                <div className="space-y-3">
                  {formComponents.map((comp, idx) => (
                    <div key={idx} className="p-3 border border-border rounded-lg bg-background space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-text-muted">Component {idx + 1}</span>
                        {formComponents.length > 1 && (
                          <button onClick={() => removeComponent(idx)} className="text-red-500 hover:text-red-700">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={comp.name}
                          onChange={(e) => updateComponent(idx, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                          placeholder="Component name"
                        />
                        <select
                          value={comp.type}
                          onChange={(e) => updateComponent(idx, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                        >
                          <option value="earning">Earning</option>
                          <option value="deduction">Deduction</option>
                        </select>
                        <select
                          value={comp.calculationType}
                          onChange={(e) => updateComponent(idx, 'calculationType', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
                        >
                          <option value="fixed">Fixed</option>
                          <option value="percentage">Percentage</option>
                        </select>
                        <input
                          type="number"
                          value={comp.value}
                          onChange={(e) => updateComponent(idx, 'value', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                          placeholder="Value"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-text">
                        <input
                          type="checkbox"
                          checked={comp.isStatutory}
                          onChange={(e) => updateComponent(idx, 'isStatutory', e.target.checked)}
                          className="rounded border-border"
                        />
                        Statutory component
                      </label>
                    </div>
                  ))}
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
