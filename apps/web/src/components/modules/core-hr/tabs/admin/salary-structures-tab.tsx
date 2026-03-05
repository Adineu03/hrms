'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  DollarSign,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface SalaryComponent {
  id?: string;
  name: string;
  type: 'earning' | 'deduction';
  calculationType: 'fixed' | 'percentage';
  value: number;
}

interface SalaryStructure {
  id: string;
  name: string;
  description: string | null;
  components: SalaryComponent[];
  status: string;
}

interface StructureFormData {
  name: string;
  description: string;
  components: SalaryComponent[];
}

const emptyComponent: SalaryComponent = {
  name: '',
  type: 'earning',
  calculationType: 'fixed',
  value: 0,
};

const emptyForm: StructureFormData = {
  name: '',
  description: '',
  components: [{ ...emptyComponent }],
};

export default function SalaryStructuresTab() {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<StructureFormData>(emptyForm);

  // Expanded rows to show components
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<StructureFormData>(emptyForm);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadStructures();
  }, []);

  const loadStructures = async () => {
    try {
      const res = await api.get('/core-hr/admin/salary-structures');
      setStructures(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch {
      setError('Failed to load salary structures.');
    } finally {
      setIsLoading(false);
    }
  };

  const addComponent = (target: 'add' | 'edit') => {
    if (target === 'add') {
      setFormData({
        ...formData,
        components: [...formData.components, { ...emptyComponent }],
      });
    } else {
      setEditFormData({
        ...editFormData,
        components: [...editFormData.components, { ...emptyComponent }],
      });
    }
  };

  const removeComponent = (index: number, target: 'add' | 'edit') => {
    if (target === 'add') {
      setFormData({
        ...formData,
        components: formData.components.filter((_, i) => i !== index),
      });
    } else {
      setEditFormData({
        ...editFormData,
        components: editFormData.components.filter((_, i) => i !== index),
      });
    }
  };

  const updateComponent = (
    index: number,
    field: keyof SalaryComponent,
    value: string | number,
    target: 'add' | 'edit',
  ) => {
    const data = target === 'add' ? formData : editFormData;
    const setData = target === 'add' ? setFormData : setEditFormData;
    const updated = data.components.map((c, i) =>
      i === index ? { ...c, [field]: value } : c,
    );
    setData({ ...data, components: updated });
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      setError('Structure name is required.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await api.post('/core-hr/admin/salary-structures', formData);
      setFormData(emptyForm);
      setShowAddForm(false);
      await loadStructures();
    } catch {
      setError('Failed to create salary structure.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (structure: SalaryStructure) => {
    setEditingId(structure.id);
    setEditFormData({
      name: structure.name,
      description: structure.description || '',
      components: structure.components?.length
        ? structure.components
        : [{ ...emptyComponent }],
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData(emptyForm);
  };

  const saveEdit = async () => {
    if (!editingId || !editFormData.name.trim()) return;
    setError(null);
    setIsSaving(true);
    try {
      await api.patch(`/core-hr/admin/salary-structures/${editingId}`, editFormData);
      await loadStructures();
      cancelEdit();
    } catch {
      setError('Failed to update salary structure.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setIsSaving(true);
    try {
      await api.delete(`/core-hr/admin/salary-structures/${id}`);
      setDeletingId(null);
      await loadStructures();
    } catch {
      setError('Failed to delete salary structure.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderComponentRows = (components: SalaryComponent[]) => (
    <div className="mt-3 border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background border-b border-border">
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
              Component
            </th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
              Type
            </th>
            <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
              Calculation
            </th>
            <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
              Value
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {components.map((comp, i) => (
            <tr key={comp.id || i} className="bg-card">
              <td className="px-3 py-2 text-text">{comp.name}</td>
              <td className="px-3 py-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    comp.type === 'earning'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {comp.type}
                </span>
              </td>
              <td className="px-3 py-2 text-text-muted">{comp.calculationType}</td>
              <td className="px-3 py-2 text-right text-text">
                {comp.calculationType === 'percentage' ? `${comp.value}%` : comp.value.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderComponentEditor = (
    components: SalaryComponent[],
    target: 'add' | 'edit',
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-text-muted">Components</label>
        <button
          type="button"
          onClick={() => addComponent(target)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add Component
        </button>
      </div>
      {components.map((comp, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={comp.name}
            onChange={(e) => updateComponent(i, 'name', e.target.value, target)}
            placeholder="Component name"
            className={`${inputClassName} text-sm flex-1`}
          />
          <select
            value={comp.type}
            onChange={(e) => updateComponent(i, 'type', e.target.value, target)}
            className={`${selectClassName} text-sm w-28`}
          >
            <option value="earning">Earning</option>
            <option value="deduction">Deduction</option>
          </select>
          <select
            value={comp.calculationType}
            onChange={(e) => updateComponent(i, 'calculationType', e.target.value, target)}
            className={`${selectClassName} text-sm w-32`}
          >
            <option value="fixed">Fixed</option>
            <option value="percentage">Percentage</option>
          </select>
          <input
            type="number"
            value={comp.value}
            onChange={(e) => updateComponent(i, 'value', parseFloat(e.target.value) || 0, target)}
            placeholder="Value"
            className={`${inputClassName} text-sm w-24`}
          />
          {components.length > 1 && (
            <button
              type="button"
              onClick={() => removeComponent(i, target)}
              className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading salary structures...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary Structures ({structures.length})
          </h2>
          <p className="text-sm text-text-muted">
            Define salary structures with earning and deduction components.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormData(emptyForm);
            cancelEdit();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Structure
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">New Salary Structure</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Structure name"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
                className={`${inputClassName} text-sm`}
              />
            </div>
          </div>
          {renderComponentEditor(formData.components, 'add')}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Structure
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setFormData(emptyForm);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editingId && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Edit Salary Structure</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Name *</label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Structure name"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
              <input
                type="text"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Brief description"
                className={`${inputClassName} text-sm`}
              />
            </div>
          </div>
          {renderComponentEditor(editFormData.components, 'edit')}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Update Structure
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Structures Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-8" />
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Description
              </th>
              <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Components
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {structures.map((structure) => (
              <>
                <tr
                  key={structure.id}
                  className="bg-card hover:bg-background/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(expandedId === structure.id ? null : structure.id)
                      }
                      className="text-text-muted hover:text-text transition-colors"
                    >
                      {expandedId === structure.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-text font-medium">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-text-muted" />
                      {structure.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {structure.description || '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-text-muted">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-background text-text-muted border border-border">
                      {structure.components?.length || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        structure.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {structure.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {deletingId === structure.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(structure.id)}
                          disabled={isSaving}
                          className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(structure)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(structure.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                {expandedId === structure.id && structure.components?.length > 0 && (
                  <tr key={`${structure.id}-detail`}>
                    <td colSpan={6} className="px-4 py-3 bg-background/50">
                      {renderComponentRows(structure.components)}
                    </td>
                  </tr>
                )}
              </>
            ))}

            {/* Empty State */}
            {structures.length === 0 && !showAddForm && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No salary structures defined yet. Click &quot;Add Structure&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
