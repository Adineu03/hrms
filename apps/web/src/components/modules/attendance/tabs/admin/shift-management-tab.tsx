'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Check,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/skeleton';
import { TableEmptyState } from '@/components/ui/empty-state';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface Shift {
  id: string;
  name: string;
  code: string;
  type: string;
  startTime: string;
  endTime: string;
  graceMinutesLate: number;
  graceMinutesEarly: number;
  isNightShift: boolean;
  isFlexible: boolean;
  flexCoreStart: string | null;
  flexCoreEnd: string | null;
  minWorkHours: number | null;
  breakConfig: string | null;
  swapEnabled: boolean;
  status: string;
}

interface ShiftFormData {
  name: string;
  code: string;
  type: string;
  startTime: string;
  endTime: string;
  graceMinutesLate: number;
  graceMinutesEarly: number;
  isNightShift: boolean;
  isFlexible: boolean;
  flexCoreStart: string;
  flexCoreEnd: string;
  minWorkHours: number;
  breakConfig: string;
  swapEnabled: boolean;
}

const SHIFT_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'morning', label: 'Morning' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
  { value: 'rotational', label: 'Rotational' },
  { value: 'flexible', label: 'Flexible' },
];

const TYPE_BADGE_STYLES: Record<string, string> = {
  general: 'bg-blue-50 text-blue-700',
  morning: 'bg-amber-50 text-amber-700',
  evening: 'bg-purple-50 text-purple-700',
  night: 'bg-indigo-50 text-indigo-700',
  rotational: 'bg-teal-50 text-teal-700',
  flexible: 'bg-cyan-50 text-cyan-700',
};

const emptyForm: ShiftFormData = {
  name: '',
  code: '',
  type: 'general',
  startTime: '09:00',
  endTime: '18:00',
  graceMinutesLate: 15,
  graceMinutesEarly: 15,
  isNightShift: false,
  isFlexible: false,
  flexCoreStart: '',
  flexCoreEnd: '',
  minWorkHours: 8,
  breakConfig: '{}',
  swapEnabled: false,
};

export default function ShiftManagementTab() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<ShiftFormData>(emptyForm);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<ShiftFormData>(emptyForm);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const res = await api.get('/attendance/admin/shifts');
      setShifts(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch {
      setError('Failed to load shifts.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Shift name and code are required.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await api.post('/attendance/admin/shifts', formData);
      setFormData(emptyForm);
      setShowAddForm(false);
      await loadShifts();
    } catch {
      setError('Failed to create shift.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (shift: Shift) => {
    setEditingId(shift.id);
    setEditFormData({
      name: shift.name,
      code: shift.code,
      type: shift.type,
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceMinutesLate: shift.graceMinutesLate,
      graceMinutesEarly: shift.graceMinutesEarly,
      isNightShift: shift.isNightShift,
      isFlexible: shift.isFlexible,
      flexCoreStart: shift.flexCoreStart || '',
      flexCoreEnd: shift.flexCoreEnd || '',
      minWorkHours: shift.minWorkHours || 8,
      breakConfig: shift.breakConfig || '{}',
      swapEnabled: shift.swapEnabled,
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
      await api.patch(`/attendance/admin/shifts/${editingId}`, editFormData);
      await loadShifts();
      cancelEdit();
    } catch {
      setError('Failed to update shift.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    setError(null);
    setIsSaving(true);
    try {
      await api.delete(`/attendance/admin/shifts/${id}`);
      await loadShifts();
    } catch {
      setError('Failed to delete shift.');
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeLabel = (type: string) =>
    SHIFT_TYPES.find((t) => t.value === type)?.label || type;

  const renderToggle = (
    checked: boolean,
    onChange: (val: boolean) => void,
    label: string,
  ) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
      <span className="text-sm text-text">{label}</span>
    </label>
  );

  const renderFormFields = (
    data: ShiftFormData,
    setData: (d: ShiftFormData) => void,
  ) => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Name *</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="Shift name"
            className={`${inputClassName} text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Code *</label>
          <input
            type="text"
            value={data.code}
            onChange={(e) => setData({ ...data, code: e.target.value })}
            placeholder="e.g. GEN-01"
            className={`${inputClassName} text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
          <select
            value={data.type}
            onChange={(e) => setData({ ...data, type: e.target.value })}
            className={`${selectClassName} text-sm`}
          >
            {SHIFT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Start Time</label>
          <input
            type="time"
            value={data.startTime}
            onChange={(e) => setData({ ...data, startTime: e.target.value })}
            className={`${inputClassName} text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">End Time</label>
          <input
            type="time"
            value={data.endTime}
            onChange={(e) => setData({ ...data, endTime: e.target.value })}
            className={`${inputClassName} text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Min Work Hours</label>
          <input
            type="number"
            value={data.minWorkHours}
            onChange={(e) => setData({ ...data, minWorkHours: parseFloat(e.target.value) || 0 })}
            className={`${inputClassName} text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Grace Late (mins)</label>
          <input
            type="number"
            value={data.graceMinutesLate}
            onChange={(e) => setData({ ...data, graceMinutesLate: parseInt(e.target.value) || 0 })}
            className={`${inputClassName} text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Grace Early (mins)</label>
          <input
            type="number"
            value={data.graceMinutesEarly}
            onChange={(e) => setData({ ...data, graceMinutesEarly: parseInt(e.target.value) || 0 })}
            className={`${inputClassName} text-sm`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Break Config (JSON)</label>
          <input
            type="text"
            value={data.breakConfig}
            onChange={(e) => setData({ ...data, breakConfig: e.target.value })}
            placeholder='{"lunch": 60}'
            className={`${inputClassName} text-sm`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5 pt-1">
        {renderToggle(data.isNightShift, (v) => setData({ ...data, isNightShift: v }), 'Night Shift')}
        {renderToggle(data.isFlexible, (v) => setData({ ...data, isFlexible: v }), 'Flexible')}
        {renderToggle(data.swapEnabled, (v) => setData({ ...data, swapEnabled: v }), 'Swap Enabled')}
      </div>

      {data.isFlexible && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Flex Core Start</label>
            <input
              type="time"
              value={data.flexCoreStart}
              onChange={(e) => setData({ ...data, flexCoreStart: e.target.value })}
              className={`${inputClassName} text-sm`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Flex Core End</label>
            <input
              type="time"
              value={data.flexCoreEnd}
              onChange={(e) => setData({ ...data, flexCoreEnd: e.target.value })}
              className={`${inputClassName} text-sm`}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return <TableSkeleton rows={4} cols={4} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shift Management ({shifts.length})
          </h2>
          <p className="text-sm text-text-muted">
            Define and manage work shifts for your organization.
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
          Add Shift
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Add Shift Form */}
      {showAddForm && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">New Shift</h3>
          {renderFormFields(formData, setFormData)}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Shift
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

      {/* Edit Shift Form */}
      {editingId && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Edit Shift</h3>
          {renderFormFields(editFormData, setEditFormData)}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Update Shift
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

      {/* Shifts Table */}
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
                Type
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Timing
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Grace (L/E)
              </th>
              <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Night
              </th>
              <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Flexible
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
            {shifts.map((shift) => (
              <tr
                key={shift.id}
                className="bg-card hover:bg-background/50 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-text font-medium">
                  {shift.name}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted font-mono">
                  {shift.code}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      TYPE_BADGE_STYLES[shift.type] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {getTypeLabel(shift.type)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {shift.startTime} - {shift.endTime}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {shift.graceMinutesLate}m / {shift.graceMinutesEarly}m
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  {shift.isNightShift ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">Yes</span>
                  ) : (
                    <span className="text-text-muted text-xs">No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  {shift.isFlexible ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700">Yes</span>
                  ) : (
                    <span className="text-text-muted text-xs">No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      shift.status === 'active'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {shift.status || 'active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(shift)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(shift.id)}
                      disabled={isSaving}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {/* Empty State */}
            {shifts.length === 0 && !showAddForm && (
              <TableEmptyState
                icon={Clock}
                title="No shifts configured"
                description="Add your first shift to define working hours."
                colSpan={9}
                action={{ label: 'Add Shift', onClick: () => { setShowAddForm(true); setFormData(emptyForm); cancelEdit(); } }}
              />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
