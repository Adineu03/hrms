'use client';

import { useEffect, useState } from 'react';
import { useColdStartFeatureStore } from '@/lib/cold-start-feature-store';
import type { GradeData } from '@hrms/shared';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  BarChart3,
  AlertCircle,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

const CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD'];

interface GradeFormData {
  name: string;
  level: number;
  salaryBandMin: string;
  salaryBandMax: string;
  currency: string;
}

const emptyForm: GradeFormData = {
  name: '',
  level: 1,
  salaryBandMin: '',
  salaryBandMax: '',
  currency: 'INR',
};

export default function GradesTab() {
  const {
    grades,
    isGradesLoading,
    fetchGrades,
    createGrade,
    updateGrade,
    deleteGrade,
    error,
  } = useColdStartFeatureStore();

  const [showAddRow, setShowAddRow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<GradeFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  const startEdit = (grade: GradeData) => {
    setEditingId(grade.id || null);
    setFormData({
      name: grade.name,
      level: grade.level,
      salaryBandMin: grade.salaryBandMin?.toString() || '',
      salaryBandMax: grade.salaryBandMax?.toString() || '',
      currency: grade.currency || 'INR',
    });
    setShowAddRow(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(emptyForm);
  };

  const startAdd = () => {
    setShowAddRow(true);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const cancelAdd = () => {
    setShowAddRow(false);
    setFormData(emptyForm);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setLocalError('Grade name is required.');
      return;
    }
    setLocalError(null);
    setIsSaving(true);
    try {
      const payload: GradeData = {
        name: formData.name.trim(),
        level: formData.level,
        salaryBandMin: formData.salaryBandMin
          ? parseFloat(formData.salaryBandMin)
          : undefined,
        salaryBandMax: formData.salaryBandMax
          ? parseFloat(formData.salaryBandMax)
          : undefined,
        currency: formData.currency,
      };
      if (editingId) {
        await updateGrade(editingId, payload);
        setEditingId(null);
      } else {
        await createGrade(payload);
        setShowAddRow(false);
      }
      setFormData(emptyForm);
    } catch {
      setLocalError('Failed to save grade.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      await deleteGrade(id);
      setDeletingId(null);
    } catch {
      setLocalError('Failed to delete grade.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (val?: number, currency?: string) => {
    if (val === undefined || val === null) return '--';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isGradesLoading && grades.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">
          Loading grades...
        </span>
      </div>
    );
  }

  const displayError = localError || error;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Grades</h2>
          <p className="text-sm text-text-muted">
            Define pay grades and salary bands for your organization.
          </p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Grade
        </button>
      </div>

      {displayError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {displayError}
        </div>
      )}

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Grade Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-20">
                Level
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Salary Band Min
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Salary Band Max
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                Currency
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {grades.map((grade) => (
              <tr
                key={grade.id}
                className="bg-card hover:bg-background/50 transition-colors"
              >
                {editingId === grade.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className={`${inputClassName} text-sm`}
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={formData.level}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            level: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className={`${inputClassName} text-sm w-16`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        value={formData.salaryBandMin}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            salaryBandMin: e.target.value,
                          })
                        }
                        placeholder="0"
                        className={`${inputClassName} text-sm`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        value={formData.salaryBandMax}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            salaryBandMax: e.target.value,
                          })
                        }
                        placeholder="0"
                        className={`${inputClassName} text-sm`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={formData.currency}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            currency: e.target.value,
                          })
                        }
                        className={`${selectClassName} text-sm`}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={handleSave}
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
                        <BarChart3 className="h-3.5 w-3.5 text-text-muted" />
                        {grade.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">
                      {grade.level}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {formatCurrency(grade.salaryBandMin, grade.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {formatCurrency(grade.salaryBandMax, grade.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {grade.currency || '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {deletingId === grade.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(grade.id!)}
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
                            onClick={() => startEdit(grade)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeletingId(grade.id || null)
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
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Grade name"
                    className={`${inputClassName} text-sm`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSave();
                      }
                      if (e.key === 'Escape') cancelAdd();
                    }}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        level: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className={`${inputClassName} text-sm w-16`}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    value={formData.salaryBandMin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaryBandMin: e.target.value,
                      })
                    }
                    placeholder="0"
                    className={`${inputClassName} text-sm`}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    value={formData.salaryBandMax}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaryBandMax: e.target.value,
                      })
                    }
                    placeholder="0"
                    className={`${inputClassName} text-sm`}
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currency: e.target.value,
                      })
                    }
                    className={`${selectClassName} text-sm`}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving || !formData.name.trim()}
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
                      onClick={cancelAdd}
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
            {grades.length === 0 && !showAddRow && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No grades configured yet. Click &quot;Add Grade&quot; to
                  get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
