'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { DesignationData, DepartmentData } from '@hrms/shared';
import { Loader2, CheckCircle2, Plus, Trash2, Pencil, X, Check } from 'lucide-react';

interface DesignationsFormProps {
  onComplete: () => void;
}

export default function DesignationsForm({ onComplete }: DesignationsFormProps) {
  const [designations, setDesignations] = useState<DesignationData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Inline editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState(1);
  const [editDeptId, setEditDeptId] = useState<string | null>(null);

  // New designation state
  const [showAddRow, setShowAddRow] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState(1);
  const [newDeptId, setNewDeptId] = useState<string | null>(null);

  // Delete confirmation
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [desigRes, deptRes] = await Promise.all([
          api.get<DesignationData[]>('/cold-start/designations'),
          api.get<DepartmentData[]>('/cold-start/departments'),
        ]);
        if (desigRes.data && Array.isArray(desigRes.data)) {
          setDesignations(desigRes.data);
        }
        if (deptRes.data && Array.isArray(deptRes.data)) {
          setDepartments(deptRes.data);
        }
      } catch {
        // No existing data — start empty
      } finally {
        setIsLoadingData(false);
      }
    }
    loadData();
  }, []);

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditName(designations[index].name);
    setEditLevel(designations[index].level);
    setEditDeptId(designations[index].departmentId || null);
    setShowAddRow(false);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditName('');
    setEditLevel(1);
    setEditDeptId(null);
  };

  const saveEdit = () => {
    if (editingIndex === null || !editName.trim()) return;
    const updated = [...designations];
    updated[editingIndex] = {
      ...updated[editingIndex],
      name: editName.trim(),
      level: editLevel,
      departmentId: editDeptId,
    };
    setDesignations(updated);
    cancelEdit();
  };

  const addDesignation = () => {
    if (!newName.trim()) return;
    const newDesig: DesignationData = {
      name: newName.trim(),
      level: newLevel,
      departmentId: newDeptId,
    };
    setDesignations([...designations, newDesig]);
    setNewName('');
    setNewLevel(1);
    setNewDeptId(null);
    setShowAddRow(false);
  };

  const removeDesignation = (index: number) => {
    setDesignations(designations.filter((_, i) => i !== index));
    setDeletingIndex(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (designations.length === 0) {
      setError('Please add at least one designation.');
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      await api.post('/cold-start/designations', { designations });
      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 800);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Failed to save designations.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName =
    'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
  const selectClassName =
    'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

  const getDeptName = (deptId: string | null | undefined) => {
    if (!deptId) return '—';
    const dept = departments.find((d) => d.id === deptId);
    return dept?.name || '—';
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading designations...</span>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CheckCircle2 className="h-10 w-10 text-accent mb-3" />
        <p className="text-text font-medium">Designations saved!</p>
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

      {/* Add Designation Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{designations.length} designation(s)</p>
        <button
          type="button"
          onClick={() => {
            setShowAddRow(true);
            cancelEdit();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Designation
        </button>
      </div>

      {/* Designations Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-20">
                Level
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Department
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {designations.map((desig, index) => (
              <tr key={desig.id || `desig-${index}`} className="bg-card hover:bg-background/50 transition-colors">
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
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={editLevel}
                        onChange={(e) => setEditLevel(parseInt(e.target.value, 10) || 1)}
                        className={`${inputClassName} text-sm w-16`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editDeptId || ''}
                        onChange={(e) => setEditDeptId(e.target.value || null)}
                        className={`${selectClassName} text-sm`}
                      >
                        <option value="">None</option>
                        {departments.map((dept) => (
                          <option key={dept.id || dept.name} value={dept.id || ''}>
                            {dept.name}
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
                    <td className="px-4 py-3 text-sm text-text">{desig.name}</td>
                    <td className="px-4 py-3 text-sm text-text">{desig.level}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {getDeptName(desig.departmentId)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {deletingIndex === index ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => removeDesignation(index)}
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
                    placeholder="Designation name"
                    className={`${inputClassName} text-sm`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addDesignation();
                      }
                      if (e.key === 'Escape') {
                        setShowAddRow(false);
                        setNewName('');
                        setNewLevel(1);
                        setNewDeptId(null);
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newLevel}
                    onChange={(e) => setNewLevel(parseInt(e.target.value, 10) || 1)}
                    className={`${inputClassName} text-sm w-16`}
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={newDeptId || ''}
                    onChange={(e) => setNewDeptId(e.target.value || null)}
                    className={`${selectClassName} text-sm`}
                  >
                    <option value="">None</option>
                    {departments.map((dept) => (
                      <option key={dept.id || dept.name} value={dept.id || ''}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={addDesignation}
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
                        setNewLevel(1);
                        setNewDeptId(null);
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
            {designations.length === 0 && !showAddRow && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">
                  No designations yet. Click &quot;Add Designation&quot; to get started.
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
