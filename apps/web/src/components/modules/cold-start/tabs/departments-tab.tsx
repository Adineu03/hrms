'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useColdStartFeatureStore } from '@/lib/cold-start-feature-store';
import type { DepartmentData } from '@hrms/shared';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Network,
  AlertCircle,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

export default function DepartmentsTab() {
  const { employees, fetchEmployees } = useColdStartFeatureStore();

  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [editHeadId, setEditHeadId] = useState<string | null>(null);

  // New department
  const [showAddRow, setShowAddRow] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newHeadId, setNewHeadId] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [deptRes] = await Promise.all([
          api.get<DepartmentData[]>('/cold-start/departments'),
          fetchEmployees(),
        ]);
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
  }, [fetchEmployees]);

  const startEdit = (dept: DepartmentData) => {
    setEditingId(dept.id || null);
    setEditName(dept.name);
    setEditParentId(dept.parentId || null);
    setEditHeadId(null); // head_id not on DepartmentData type but used in UI
    setShowAddRow(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditParentId(null);
    setEditHeadId(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.patch(`/cold-start/departments/${editingId}`, {
        name: editName.trim(),
        parentId: editParentId,
        headId: editHeadId,
      });
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === editingId
            ? { ...d, name: editName.trim(), parentId: editParentId }
            : d,
        ),
      );
      cancelEdit();
    } catch {
      setError('Failed to update department.');
    } finally {
      setIsSaving(false);
    }
  };

  const addDepartment = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await api.post('/cold-start/departments', {
        departments: [
          { name: newName.trim(), parentId: newParentId },
        ],
      });
      // The API may return the list or the single dept
      const data = res.data;
      if (Array.isArray(data)) {
        setDepartments(data);
      } else {
        // Reload
        const reloadRes = await api.get<DepartmentData[]>(
          '/cold-start/departments',
        );
        setDepartments(reloadRes.data || []);
      }
      setNewName('');
      setNewParentId(null);
      setNewHeadId(null);
      setShowAddRow(false);
    } catch {
      setError('Failed to add department.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDepartment = async (id: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await api.delete(`/cold-start/departments/${id}`);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      setDeletingId(null);
    } catch {
      setError('Failed to delete department.');
    } finally {
      setIsSaving(false);
    }
  };

  const getParentOptions = (excludeId?: string | null) => {
    return departments.filter((d) => d.id !== excludeId);
  };

  const getDeptName = (id: string | null | undefined) => {
    if (!id) return '--';
    return departments.find((d) => d.id === id)?.name || '--';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">
          Loading departments...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Departments</h2>
          <p className="text-sm text-text-muted">
            {departments.length} department(s) configured.
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
          Add Department
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
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Parent Department
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Head
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {departments.map((dept) => (
              <tr
                key={dept.id || dept.name}
                className="bg-card hover:bg-background/50 transition-colors"
              >
                {editingId === dept.id ? (
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
                        onChange={(e) =>
                          setEditParentId(e.target.value || null)
                        }
                        className={`${selectClassName} text-sm`}
                      >
                        <option value="">None (top-level)</option>
                        {getParentOptions(editingId).map((d) => (
                          <option key={d.id} value={d.id || ''}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editHeadId || ''}
                        onChange={(e) =>
                          setEditHeadId(e.target.value || null)
                        }
                        className={`${selectClassName} text-sm`}
                      >
                        <option value="">None</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName || ''}
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
                        <Network className="h-3.5 w-3.5 text-text-muted" />
                        {dept.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {getDeptName(dept.parentId)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">--</td>
                    <td className="px-4 py-3 text-right">
                      {deletingId === dept.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => deleteDepartment(dept.id!)}
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
                            onClick={() => startEdit(dept)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(dept.id || null)}
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
                        setNewHeadId(null);
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
                    {departments.map((d) => (
                      <option key={d.id || d.name} value={d.id || ''}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={newHeadId || ''}
                    onChange={(e) => setNewHeadId(e.target.value || null)}
                    className={`${selectClassName} text-sm`}
                  >
                    <option value="">None</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName || ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={addDepartment}
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
                        setNewParentId(null);
                        setNewHeadId(null);
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
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No departments configured yet. Click &quot;Add
                  Department&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
