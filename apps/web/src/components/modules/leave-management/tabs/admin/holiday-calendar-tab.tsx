'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  CalendarDays,
  Upload,
  X,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  isOptional: boolean;
  applicableLocations: string[];
  year: number;
}

interface HolidayFormData {
  name: string;
  date: string;
  type: string;
  isOptional: boolean;
  applicableLocations: string;
}

const HOLIDAY_TYPES = [
  { value: 'national', label: 'National Holiday' },
  { value: 'regional', label: 'Regional Holiday' },
  { value: 'religious', label: 'Religious Holiday' },
  { value: 'company', label: 'Company Holiday' },
  { value: 'restricted', label: 'Restricted Holiday' },
];

const TYPE_BADGE_STYLES: Record<string, string> = {
  national: 'bg-red-50 text-red-700',
  regional: 'bg-blue-50 text-blue-700',
  religious: 'bg-purple-50 text-purple-700',
  company: 'bg-green-50 text-green-700',
  restricted: 'bg-amber-50 text-amber-700',
};

const emptyForm: HolidayFormData = {
  name: '',
  date: '',
  type: 'national',
  isOptional: false,
  applicableLocations: '',
};

export default function HolidayCalendarTab() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Year selector
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>(emptyForm);

  // Bulk create
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  useEffect(() => {
    loadHolidays();
  }, [selectedYear]);

  const loadHolidays = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/leave-management/admin/holidays', {
        params: { year: selectedYear },
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setHolidays(data);
    } catch {
      setError('Failed to load holidays.');
    } finally {
      setIsLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (holiday: Holiday) => {
    setEditingId(holiday.id);
    setFormData({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
      isOptional: holiday.isOptional,
      applicableLocations: Array.isArray(holiday.applicableLocations)
        ? holiday.applicableLocations.join(', ')
        : '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.date) {
      setError('Holiday name and date are required.');
      return;
    }
    setError(null);
    setIsSaving(true);

    const payload = {
      name: formData.name.trim(),
      date: formData.date,
      type: formData.type,
      isOptional: formData.isOptional,
      applicableLocations: formData.applicableLocations
        ? formData.applicableLocations.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    };

    try {
      if (editingId) {
        await api.patch(`/leave-management/admin/holidays/${editingId}`, payload);
      } else {
        await api.post('/leave-management/admin/holidays', payload);
      }
      closeModal();
      await loadHolidays();
    } catch {
      setError(`Failed to ${editingId ? 'update' : 'create'} holiday.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    setError(null);
    setIsSaving(true);
    try {
      await api.delete(`/leave-management/admin/holidays/${id}`);
      await loadHolidays();
    } catch {
      setError('Failed to delete holiday.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkCreate = async () => {
    if (!bulkText.trim()) {
      setError('Please enter holiday data.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      const lines = bulkText.trim().split('\n').filter(Boolean);
      const holidays = lines.map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          name: parts[0] || '',
          date: parts[1] || '',
          type: parts[2] || 'national',
          isOptional: parts[3]?.toLowerCase() === 'true',
          applicableLocations: parts[4] ? parts[4].split(';').map((s) => s.trim()) : [],
        };
      });

      await api.post('/leave-management/admin/holidays/bulk', { holidays });
      setShowBulkCreate(false);
      setBulkText('');
      setSuccessMsg(`${holidays.length} holidays created successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadHolidays();
    } catch {
      setError('Failed to bulk create holidays.');
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeLabel = (type: string) =>
    HOLIDAY_TYPES.find((t) => t.value === type)?.label || type;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Group holidays by month
  const monthGroups: Record<string, Holiday[]> = {};
  holidays.forEach((h) => {
    const month = h.date ? h.date.substring(0, 7) : 'unknown';
    if (!monthGroups[month]) monthGroups[month] = [];
    monthGroups[month].push(h);
  });
  const sortedMonths = Object.keys(monthGroups).sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading holidays...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Holiday Calendar ({holidays.length})
          </h2>
          <p className="text-sm text-text-muted">
            Manage public holidays and restricted holidays for your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className={`${selectClassName} w-28 text-sm`}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowBulkCreate(!showBulkCreate)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Bulk Add
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Holiday
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Bulk Create Section */}
      {showBulkCreate && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">Bulk Add Holidays</h3>
          <p className="text-xs text-text-muted">
            Enter one holiday per line in CSV format: Name, Date (YYYY-MM-DD), Type, IsOptional (true/false), Locations (semicolon separated)
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={6}
            placeholder={`Republic Day, 2026-01-26, national, false, All\nHoli, 2026-03-14, religious, false, All\nCompany Foundation Day, 2026-06-15, company, true, HQ;Branch`}
            className={`${inputClassName} text-sm font-mono`}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkCreate}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import Holidays
            </button>
            <button
              type="button"
              onClick={() => {
                setShowBulkCreate(false);
                setBulkText('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Holiday Table grouped by month */}
      {sortedMonths.length > 0 ? (
        sortedMonths.map((month) => {
          const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
          });
          return (
            <div key={month} className="space-y-2">
              <h3 className="text-sm font-semibold text-text-muted">{monthLabel}</h3>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-background border-b border-border">
                      <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                        Holiday Name
                      </th>
                      <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                        Date
                      </th>
                      <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                        Type
                      </th>
                      <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                        Optional
                      </th>
                      <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                        Locations
                      </th>
                      <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthGroups[month].map((holiday) => (
                      <tr
                        key={holiday.id}
                        className="bg-card hover:bg-background/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-text font-medium">
                          {holiday.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-muted">
                          {formatDate(holiday.date)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              TYPE_BADGE_STYLES[holiday.type] || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {getTypeLabel(holiday.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {holiday.isOptional ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">Yes</span>
                          ) : (
                            <span className="text-text-muted text-xs">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-muted">
                          {Array.isArray(holiday.applicableLocations) && holiday.applicableLocations.length > 0
                            ? holiday.applicableLocations.join(', ')
                            : 'All'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(holiday)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(holiday.id)}
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
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      ) : (
        <div className="border border-border rounded-xl p-8 text-center">
          <CalendarDays className="h-8 w-8 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-muted">
            No holidays configured for {selectedYear}. Click &quot;Add Holiday&quot; to get started.
          </p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">
                {editingId ? 'Edit Holiday' : 'New Holiday'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-background transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Holiday Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Republic Day"
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`${inputClassName} text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className={`${selectClassName} text-sm`}
                >
                  {HOLIDAY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isOptional: !formData.isOptional })}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    formData.isOptional ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      formData.isOptional ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
                <span className="text-sm text-text">Optional / Restricted Holiday</span>
              </label>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Applicable Locations (comma separated)</label>
                <input
                  type="text"
                  value={formData.applicableLocations}
                  onChange={(e) => setFormData({ ...formData, applicableLocations: e.target.value })}
                  placeholder="Leave empty for all locations"
                  className={`${inputClassName} text-sm`}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editingId ? 'Update Holiday' : 'Create Holiday'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
