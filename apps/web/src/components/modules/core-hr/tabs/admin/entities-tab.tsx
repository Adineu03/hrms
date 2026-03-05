'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Plus,
  Pencil,
  X,
  Check,
  Building,
  AlertCircle,
  Power,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';

interface Entity {
  id: string;
  name: string;
  legalName: string;
  country: string;
  taxId: string | null;
  registrationNumber: string | null;
  address: string | null;
  status: string;
}

interface EntityFormData {
  name: string;
  legalName: string;
  country: string;
  taxId: string;
  registrationNumber: string;
  address: string;
}

const emptyForm: EntityFormData = {
  name: '',
  legalName: '',
  country: '',
  taxId: '',
  registrationNumber: '',
  address: '',
};

export default function EntitiesTab() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<EntityFormData>(emptyForm);

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EntityFormData>(emptyForm);

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      const res = await api.get('/core-hr/admin/entities');
      setEntities(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch {
      setError('Failed to load entities.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.legalName.trim()) {
      setError('Name and legal name are required.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await api.post('/core-hr/admin/entities', formData);
      setFormData(emptyForm);
      setShowAddForm(false);
      await loadEntities();
    } catch {
      setError('Failed to create entity.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (entity: Entity) => {
    setEditingId(entity.id);
    setEditFormData({
      name: entity.name,
      legalName: entity.legalName,
      country: entity.country,
      taxId: entity.taxId || '',
      registrationNumber: entity.registrationNumber || '',
      address: entity.address || '',
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
      await api.patch(`/core-hr/admin/entities/${editingId}`, editFormData);
      await loadEntities();
      cancelEdit();
    } catch {
      setError('Failed to update entity.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (entity: Entity) => {
    setError(null);
    setIsSaving(true);
    try {
      const newStatus = entity.status === 'active' ? 'inactive' : 'active';
      await api.patch(`/core-hr/admin/entities/${entity.id}`, { status: newStatus });
      await loadEntities();
    } catch {
      setError('Failed to update entity status.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading entities...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Building className="h-5 w-5" />
            Legal Entities ({entities.length})
          </h2>
          <p className="text-sm text-text-muted">
            Manage legal entities and subsidiaries in your organization.
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
          Add Entity
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Add Entity Form */}
      {showAddForm && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">New Entity</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Entity name"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Legal Name *</label>
              <input
                type="text"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                placeholder="Legal registered name"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Country"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Tax ID</label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="Tax identification number"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Registration Number</label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                placeholder="Company registration number"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Registered address"
                className={`${inputClassName} text-sm`}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Entity
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

      {/* Entities Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Legal Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Country
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Tax ID
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
            {entities.map((entity) => (
              <tr
                key={entity.id}
                className="bg-card hover:bg-background/50 transition-colors"
              >
                {editingId === entity.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className={`${inputClassName} text-sm`}
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editFormData.legalName}
                        onChange={(e) => setEditFormData({ ...editFormData, legalName: e.target.value })}
                        className={`${inputClassName} text-sm`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editFormData.country}
                        onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                        className={`${inputClassName} text-sm`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editFormData.taxId}
                        onChange={(e) => setEditFormData({ ...editFormData, taxId: e.target.value })}
                        className={`${inputClassName} text-sm`}
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-text-muted">
                      {entity.status}
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
                        <Building className="h-3.5 w-3.5 text-text-muted" />
                        {entity.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {entity.legalName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {entity.country || '--'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {entity.taxId || '--'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entity.status === 'active'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {entity.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(entity)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(entity)}
                          disabled={isSaving}
                          className="p-1.5 rounded-lg text-text-muted hover:text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-50"
                          title={entity.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {/* Empty State */}
            {entities.length === 0 && !showAddForm && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No entities configured yet. Click &quot;Add Entity&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
