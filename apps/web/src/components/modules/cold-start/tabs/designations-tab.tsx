'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { DesignationData, DepartmentData } from '@hrms/shared';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Briefcase,
  AlertCircle,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

export default function DesignationsTab() {
  const [designations, setDesignations] = useState<DesignationData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState(1);
  const [editDeptId, setEditDeptId] = useState<string | null>(null);

  // New designation
  const [showAddRow, setShowAddRow] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState(1);
  const [newDeptId, setNewDeptId] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        // Data may not exist yet
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const startEdit = (desig: DesignationData) => {
    setEditingId(desig.id || null);
    setEditName(desig.name);
    setEditLevel(desig.level);
    setEditDeptId(desig.departmentId || null);
    setShowAddRow(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditLevel(1);
    setEditDeptId(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.patch(`/cold-start/designations/${editingId}`, {
        name: editName.trim(),
        level: editLevel,
        departmentId: editDeptId,
      });
      setDesignations((prev) =>
        prev.map((d) =>
          d.id === editingId
            ? {
                ...d,
                name: editName.trim(),
                level: editLevel,
                departmentId: editDeptId,
              }
            : d,
        ),
      );
      cancelEdit();
    } catch {
      setError('Failed to update designation.');
    } finally {
      setIsSaving(false);
    }
  };

  const addDesignation = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await api.post('/cold-start/designations', {
        designations: [
          {
            name: newName.trim(),
            level: newLevel,
            departmentId: newDeptId,
          },
        ],
      });
      const data = res.data;
      if (Array.isArray(data)) {
        setDesignations(data);
      } else {
        const reloadRes = await api.get<DesignationData[]>(
          '/cold-start/designations',
        );
        setDesignations(reloadRes.data || []);
      }
      setNewName('');
      setNewLevel(1);
      setNewDeptId(null);
      setShowAddRow(false);
    } catch {
      setError('Failed to add designation.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDesignation = async (id: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await api.delete(`/cold-start/designations/${id}`);
      setDesignations((prev) => prev.filter((d) => d.id !== id));
      setDeletingId(null);
    } catch {
      setError('Failed to delete designation.');
    } finally {
      setIsSaving(false);
    }
  };

  const getDeptName = (deptId: string | null | undefined) => {
    if (!deptId) return '--';
    return departments.find((d) => d.id === deptId)?.name || '--';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">
          Loading designations...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Designations</h2>
          <p className="text-sm text-text-muted">
            {designations.length} designation(s) configured.
          </p>
        </div>
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

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
            {designations.map((desig) => (
              <tr
                key={desig.id || desig.name}
                className="bg-card hover:bg-background/50 transition-colors"
              >
                {editingId === desig.id ? (
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
                        onChange={(e) =>
                          setEditLevel(parseInt(e.target.value, 10) || 1)
                        }
                        className={`${inputClassName} text-sm w-16`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editDeptId || ''}
                        onChange={(e) =>
                          setEditDeptId(e.target.value || null)
                        }
                        className={`${selectClassName} text-sm`}
                      >
                        <option value="">None</option>
                        {departments.map((dept) => (
                          <option
                            key={dept.id || dept.name}
                            value={dept.id || ''}
                          >
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
                          disabled={isSaving}
                          className="p-1.5 rounded-lg text-accent hover:bg-green-50 transition-colors disabled:opacity-50"
                          title="Save"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
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
                    <td className="px-4 py-3 text-sm text-text font-medium">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-text-muted" />
                        {desig.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">
                      {desig.level}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {getDeptName(desig.departmentId)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {deletingId === desig.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => deleteDesignation(desig.id!)}
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
                            onClick={() => startEdit(desig)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeletingId(desig.id || null)
                            }
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
                    onChange={(e) =>
                      setNewLevel(parseInt(e.target.value, 10) || 1)
                    }
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
                      <option
                        key={dept.id || dept.name}
                        value={dept.id || ''}
                      >
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
                      disabled={isSaving || !newName.trim()}
                      className="p-1.5 rounded-lg text-accent hover:bg-green-50 transition-colors disabled:opacity-50"
                      title="Add"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
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
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No designations configured yet. Click &quot;Add
                  Designation&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
