'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { DepartmentData } from '@hrms/shared';
import { Loader2, CheckCircle2, Plus, Trash2, Pencil, X, Check } from 'lucide-react';

interface DepartmentsFormProps {
  onComplete: () => void;
}

export default function DepartmentsForm({ onComplete }: DepartmentsFormProps) {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Inline editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState<string | null>(null);

  // New department state
  const [showAddRow, setShowAddRow] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<string | null>(null);

  // Delete confirmation
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadDepartments() {
      try {
        const res = await api.get<DepartmentData[]>('/cold-start/departments');
        if (res.data && Array.isArray(res.data)) {
          setDepartments(res.data);
        }
      } catch {
        // No existing data — start empty
      } finally {
        setIsLoadingData(false);
      }
    }
    loadDepartments();
  }, []);

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditName(departments[index].name);
    setEditParentId(departments[index].parentId || null);
    setShowAddRow(false);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditName('');
    setEditParentId(null);
  };

  const saveEdit = () => {
    if (editingIndex === null || !editName.trim()) return;
    const updated = [...departments];
    updated[editingIndex] = {
      ...updated[editingIndex],
      name: editName.trim(),
      parentId: editParentId,
    };
    setDepartments(updated);
    cancelEdit();
  };

  const addDepartment = () => {
    if (!newName.trim()) return;
    const newDept: DepartmentData = {
      name: newName.trim(),
      parentId: newParentId,
    };
    setDepartments([...departments, newDept]);
    setNewName('');
    setNewParentId(null);
    setShowAddRow(false);
  };

  const removeDepartment = (index: number) => {
    const dept = departments[index];
    // Also remove children that reference this department
    const updated = departments.filter((_, i) => i !== index);
    // If dept has an ID, clear parentId references
    if (dept.id) {
      updated.forEach((d) => {
        if (d.parentId === dept.id) {
          d.parentId = null;
        }
      });
    }
    setDepartments(updated);
    setDeletingIndex(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (departments.length === 0) {
      setError('Please add at least one department.');
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      await api.post('/cold-start/departments', { departments });
      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 800);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Failed to save departments.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName =
    'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
  const selectClassName =
    'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

  // Build parent options from departments that have IDs or from the list by index
  const getParentOptions = (excludeIndex?: number) => {
    return departments
      .map((d, i) => ({ ...d, _index: i }))
      .filter((d) => d._index !== excludeIndex)
      .map((d) => ({
        value: d.id || `temp-${d._index}`,
        label: d.name,
      }));
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading departments...</span>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CheckCircle2 className="h-10 w-10 text-accent mb-3" />
        <p className="text-text font-medium">Departments saved!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Add Department Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{departments.length} department(s)</p>
        <button
          type="button"
          onClick={() => {
            setShowAddRow(true);
            cancelEdit();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Department
        </button>
      </div>

      {/* Departments Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Parent Department
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {departments.map((dept, index) => (
              <tr key={dept.id || `dept-${index}`} className="bg-card hover:bg-background/50 transition-colors">
                {editingIndex === index ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`${inputClassName} text-sm`}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveEdit();
                          }
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editParentId || ''}
                        onChange={(e) => setEditParentId(e.target.value || null)}
                        className={`${selectClassName} text-sm`}
                      >
                        <option value="">None (top-level)</option>
                        {getParentOptions(index).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="p-1.5 rounded-lg text-accent hover:bg-green-50 transition-colors"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg text-text-muted hover:bg-background transition-colors"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm text-text">{dept.name}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {dept.parentId
                        ? departments.find((d) => d.id === dept.parentId)?.name || '—'
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {deletingIndex === index ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => removeDepartment(index)}
                            className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingIndex(null)}
                            className="px-2 py-1 text-xs rounded border border-border text-text hover:bg-background transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(index)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingIndex(index)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}

            {/* Add Row */}
            {showAddRow && (
              <tr className="bg-primary/5">
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Department name"
                    className={`${inputClassName} text-sm`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDepartment();
                      }
                      if (e.key === 'Escape') {
                        setShowAddRow(false);
                        setNewName('');
                        setNewParentId(null);
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={newParentId || ''}
                    onChange={(e) => setNewParentId(e.target.value || null)}
                    className={`${selectClassName} text-sm`}
                  >
                    <option value="">None (top-level)</option>
                    {getParentOptions().map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={addDepartment}
                      disabled={!newName.trim()}
                      className="p-1.5 rounded-lg text-accent hover:bg-green-50 transition-colors disabled:opacity-50"
                      title="Add"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddRow(false);
                        setNewName('');
                        setNewParentId(null);
                      }}
                      className="p-1.5 rounded-lg text-text-muted hover:bg-background transition-colors"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty State */}
            {departments.length === 0 && !showAddRow && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-text-muted">
                  No departments yet. Click &quot;Add Department&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Continue'
          )}
        </button>
      </div>
    </form>
  );
}
