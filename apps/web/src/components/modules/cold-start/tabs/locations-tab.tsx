'use client';

import { useEffect, useState } from 'react';
import { useColdStartFeatureStore } from '@/lib/cold-start-feature-store';
import type { LocationData } from '@hrms/shared';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  MapPin,
  AlertCircle,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

const LOCATION_TYPES = [
  { value: 'office', label: 'Office' },
  { value: 'branch', label: 'Branch' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'remote_hub', label: 'Remote Hub' },
];

interface LocationFormData {
  name: string;
  code: string;
  type: string;
  city: string;
  country: string;
  isPrimary: boolean;
  isActive: boolean;
}

const emptyForm: LocationFormData = {
  name: '',
  code: '',
  type: 'office',
  city: '',
  country: '',
  isPrimary: false,
  isActive: true,
};

export default function LocationsTab() {
  const {
    locations,
    isLocationsLoading,
    fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    error,
  } = useColdStartFeatureStore();

  const [showAddRow, setShowAddRow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LocationFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const startEdit = (loc: LocationData) => {
    setEditingId(loc.id || null);
    setFormData({
      name: loc.name,
      code: loc.code || '',
      type: loc.type || 'office',
      city: loc.city || '',
      country: loc.country || '',
      isPrimary: loc.isPrimary || false,
      isActive: loc.isActive !== false,
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
      setLocalError('Location name is required.');
      return;
    }
    setLocalError(null);
    setIsSaving(true);
    try {
      if (editingId) {
        await updateLocation(editingId, formData);
        setEditingId(null);
      } else {
        await createLocation(formData as LocationData);
        setShowAddRow(false);
      }
      setFormData(emptyForm);
    } catch {
      setLocalError('Failed to save location.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      await deleteLocation(id);
      setDeletingId(null);
    } catch {
      setLocalError('Failed to delete location.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLocationsLoading && locations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">
          Loading locations...
        </span>
      </div>
    );
  }

  const displayError = localError || error;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Locations</h2>
          <p className="text-sm text-text-muted">
            Manage your office locations and branches.
          </p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Location
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
                Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Code
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                City
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Type
              </th>
              <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Primary
              </th>
              <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Active
              </th>
              <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {locations.map((loc) => (
              <tr
                key={loc.id}
                className="bg-card hover:bg-background/50 transition-colors"
              >
                {editingId === loc.id ? (
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
                        type="text"
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({ ...formData, code: e.target.value })
                        }
                        className={`${inputClassName} text-sm`}
                        placeholder="HQ"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        className={`${inputClassName} text-sm`}
                        placeholder="City"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value })
                        }
                        className={`${selectClassName} text-sm`}
                      >
                        {LOCATION_TYPES.map((lt) => (
                          <option key={lt.value} value={lt.value}>
                            {lt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={formData.isPrimary}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isPrimary: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
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
                        <MapPin className="h-3.5 w-3.5 text-text-muted" />
                        {loc.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {loc.code || '--'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {loc.city || '--'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-background text-text-muted border border-border">
                        {LOCATION_TYPES.find((lt) => lt.value === loc.type)
                          ?.label || loc.type || '--'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {loc.isPrimary ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          Primary
                        </span>
                      ) : (
                        <span className="text-text-muted">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          loc.isActive !== false
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {loc.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {deletingId === loc.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(loc.id!)}
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
                            onClick={() => startEdit(loc)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(loc.id || null)}
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
                    placeholder="Location name"
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
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="HQ"
                    className={`${inputClassName} text-sm`}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="City"
                    className={`${inputClassName} text-sm`}
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className={`${selectClassName} text-sm`}
                  >
                    {LOCATION_TYPES.map((lt) => (
                      <option key={lt.value} value={lt.value}>
                        {lt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={formData.isPrimary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isPrimary: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isActive: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
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
            {locations.length === 0 && !showAddRow && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  No locations configured yet. Click &quot;Add Location&quot; to
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
