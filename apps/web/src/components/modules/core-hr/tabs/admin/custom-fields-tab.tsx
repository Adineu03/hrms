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
  Settings2,
  AlertCircle,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface CustomField {
  id: string;
  entity: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  options: string[] | null;
  status: string;
}

interface FieldFormData {
  entity: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  options: string;
}

const ENTITY_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'department', label: 'Department' },
  { value: 'designation', label: 'Designation' },
  { value: 'benefit_plan', label: 'Benefit Plan' },
  { value: 'salary_structure', label: 'Salary Structure' },
  { value: 'document', label: 'Document' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select (Dropdown)' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
];

const emptyForm: FieldFormData = {
  entity: 'employee',
  fieldName: '',
  fieldLabel: '',
  fieldType: 'text',
  isRequired: false,
  options: '',
};

export default function CustomFieldsTab() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<FieldFormData>(emptyForm);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<FieldFormData>(emptyForm);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      const res = await api.get('/core-hr/admin/custom-fields');
      setFields(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch {
      setError('Failed to load custom fields.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.fieldName.trim() || !formData.fieldLabel.trim()) {
      setError('Field name and label are required.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        options:
          formData.fieldType === 'select' || formData.fieldType === 'multi_select'
            ? formData.options
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean)
            : null,
      };
      await api.post('/core-hr/admin/custom-fields', payload);
      setFormData(emptyForm);
      setShowAddForm(false);
      await loadFields();
    } catch {
      setError('Failed to create custom field.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (field: CustomField) => {
    setEditingId(field.id);
    setEditFormData({
      entity: field.entity,
      fieldName: field.fieldName,
      fieldLabel: field.fieldLabel,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      options: field.options ? field.options.join(', ') : '',
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData(emptyForm);
  };

  const saveEdit = async () => {
    if (!editingId || !editFormData.fieldName.trim() || !editFormData.fieldLabel.trim()) return;
    setError(null);
    setIsSaving(true);
    try {
      const payload = {
        ...editFormData,
        options:
          editFormData.fieldType === 'select' || editFormData.fieldType === 'multi_select'
            ? editFormData.options
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean)
            : null,
      };
      await api.patch(`/core-hr/admin/custom-fields/${editingId}`, payload);
      await loadFields();
      cancelEdit();
    } catch {
      setError('Failed to update custom field.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setIsSaving(true);
    try {
      await api.delete(`/core-hr/admin/custom-fields/${id}`);
      setDeletingId(null);
      await loadFields();
    } catch {
      setError('Failed to delete custom field.');
    } finally {
      setIsSaving(false);
    }
  };

  const getEntityLabel = (entity: string) =>
    ENTITY_OPTIONS.find((e) => e.value === entity)?.label || entity;

  const getFieldTypeLabel = (type: string) =>
    FIELD_TYPES.find((t) => t.value === type)?.label || type;

  const showOptionsField = (type: string) =>
    type === 'select' || type === 'multi_select';

  const renderFieldForm = (
    data: FieldFormData,
    setData: (d: FieldFormData) => void,
    onSave: () => void,
    onCancel: () => void,
    title: string,
    saveLabel: string,
  ) => (
    <div className="bg-background border border-border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Entity *</label>
          <select
            value={data.entity}
            onChange={(e) => setData({ ...data, entity: e.target.value })}
            className={`${selectClassName} text-sm`}
          >
            {ENTITY_OPTIONS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Field Name *</label>
          <input
            type="text"
            value={data.fieldName}
            onChange={(e) => setData({ ...data, fieldName: e.target.value })}
            placeholder="e.g. employee_id_number"
            className={`${inputClassName} text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Field Label *</label>
          <input
            type="text"
            value={data.fieldLabel}
            onChange={(e) => setData({ ...data, fieldLabel: e.target.value })}
            placeholder="e.g. Employee ID Number"
            className={`${inputClassName} text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Field Type</label>
          <select
            value={data.fieldType}
            onChange={(e) => setData({ ...data, fieldType: e.target.value })}
            className={`${selectClassName} text-sm`}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id={`required-${title}`}
            checked={data.isRequired}
            onChange={(e) => setData({ ...data, isRequired: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor={`required-${title}`} className="text-sm text-text">
            Required field
          </label>
        </div>
        {showOptionsField(data.fieldType) && (
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Options (comma-separated)
            </label>
            <input
              type="text"
              value={data.options}
              onChange={(e) => setData({ ...data, options: e.target.value })}
              placeholder="Option 1, Option 2, Option 3"
              className={`${inputClassName} text-sm`}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading custom fields...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Custom Fields ({fields.length})
          </h2>
          <p className="text-sm text-text-muted">
            Define custom fields to extend data models across the system.
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
          Add Custom Field
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm &&
        renderFieldForm(
          formData,
          setFormData,
          handleAdd,
          () => {
            setShowAddForm(false);
            setFormData(emptyForm);
          },
          'New Custom Field',
          'Save Field',
        )}

      {/* Edit Form */}
      {editingId &&
        renderFieldForm(
          editFormData,
          setEditFormData,
          saveEdit,
          cancelEdit,
          'Edit Custom Field',
          'Update Field',
        )}

      {/* Fields Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Field Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Label
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Type
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Entity
              </th>
              <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Required
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.map((field) => (
              <tr
                key={field.id}
                className="bg-card hover:bg-background/50 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-text font-medium">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-3.5 w-3.5 text-text-muted" />
                    {field.fieldName}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {field.fieldLabel}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-background text-text-muted border border-border">
                    {getFieldTypeLabel(field.fieldType)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {getEntityLabel(field.entity)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  {field.isRequired ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                      Required
                    </span>
                  ) : (
                    <span className="text-text-muted">--</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {deletingId === field.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(field.id)}
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
                        onClick={() => startEdit(field)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(field.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {/* Empty State */}
            {fields.length === 0 && !showAddForm && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No custom fields defined yet. Click &quot;Add Custom Field&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
