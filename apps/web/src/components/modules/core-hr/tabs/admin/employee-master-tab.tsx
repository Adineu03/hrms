'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Plus,
  Pencil,
  Search,
  AlertCircle,
  Users,
  X,
  Check,
  CheckSquare,
  Square,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/skeleton';
import { TableEmptyState } from '@/components/ui/empty-state';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string | null;
  designation: string | null;
  employmentType: string;
  status: string;
  joiningDate: string | null;
}

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  designation: string;
  employmentType: string;
}

const emptyForm: EmployeeFormData = {
  firstName: '',
  lastName: '',
  email: '',
  department: '',
  designation: '',
  employmentType: 'full_time',
};

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'freelance', label: 'Freelance' },
];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-red-50 text-red-700',
  probation: 'bg-yellow-50 text-yellow-700',
  notice_period: 'bg-orange-50 text-orange-700',
  terminated: 'bg-gray-100 text-gray-600',
};

export default function EmployeeMasterTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  // Mass selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMassUpdate, setShowMassUpdate] = useState(false);
  const [massStatus, setMassStatus] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await api.get('/core-hr/admin/employees');
      setEmployees(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch {
      setError('Failed to load employees.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.firstName.trim() || !formData.email.trim()) {
      setError('First name and email are required.');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await api.post('/core-hr/admin/employees', formData);
      setFormData(emptyForm);
      setShowAddForm(false);
      await loadEmployees();
    } catch {
      setError('Failed to add employee.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMassUpdate = async () => {
    if (selectedIds.size === 0 || !massStatus) return;
    setError(null);
    setIsSaving(true);
    try {
      await api.patch('/core-hr/admin/employees/bulk-update', {
        ids: Array.from(selectedIds),
        updates: { status: massStatus },
      });
      setSelectedIds(new Set());
      setShowMassUpdate(false);
      setMassStatus('');
      await loadEmployees();
    } catch {
      setError('Failed to update employees.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
    }
  };

  // Derive unique departments for filter
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))] as string[];

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      !searchQuery ||
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = !filterDepartment || emp.department === filterDepartment;
    const matchesType = !filterType || emp.employmentType === filterType;
    const matchesStatus = !filterStatus || emp.status === filterStatus;
    return matchesSearch && matchesDept && matchesType && matchesStatus;
  });

  if (isLoading) {
    return <TableSkeleton rows={5} cols={6} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Master ({employees.length})
          </h2>
          <p className="text-sm text-text-muted">
            Manage all employees in your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setShowMassUpdate(!showMassUpdate)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              Mass Update ({selectedIds.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setFormData(emptyForm);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Employee
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Mass Update Bar */}
      {showMassUpdate && selectedIds.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
          <span className="text-sm font-medium text-text">
            Update {selectedIds.size} employee(s):
          </span>
          <select
            value={massStatus}
            onChange={(e) => setMassStatus(e.target.value)}
            className={`${selectClassName} w-40 text-sm`}
          >
            <option value="">Select status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="probation">Probation</option>
            <option value="notice_period">Notice Period</option>
          </select>
          <button
            type="button"
            onClick={handleMassUpdate}
            disabled={!massStatus || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowMassUpdate(false);
              setSelectedIds(new Set());
            }}
            className="p-1.5 rounded-lg text-text-muted hover:bg-background transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text">New Employee</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="First name"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Last name"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@company.com"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Department"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Designation"
                className={`${inputClassName} text-sm`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className={`${selectClassName} text-sm`}
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
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
              Save Employee
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

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className={`${inputClassName} pl-10 text-sm`}
          />
        </div>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className={`${selectClassName} w-40 text-sm`}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={`${selectClassName} w-40 text-sm`}
        >
          <option value="">All Types</option>
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`${selectClassName} w-36 text-sm`}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="probation">Probation</option>
          <option value="notice_period">Notice Period</option>
        </select>
      </div>

      {/* Employee Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-10">
                <button type="button" onClick={toggleSelectAll} className="text-text-muted hover:text-text">
                  {selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0 ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Email
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Department
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Designation
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
            {filteredEmployees.map((emp) => (
              <tr
                key={emp.id}
                className="bg-card hover:bg-background/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <button type="button" onClick={() => toggleSelect(emp.id)} className="text-text-muted hover:text-text">
                    {selectedIds.has(emp.id) ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-text font-medium">
                  {emp.firstName} {emp.lastName}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {emp.email}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {emp.department || '--'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {emp.designation || '--'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_STYLES[emp.status] || STATUS_STYLES.active
                    }`}
                  >
                    {emp.status?.replace('_', ' ') || 'active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {/* Empty State */}
            {filteredEmployees.length === 0 && employees.length === 0 && (
              <TableEmptyState
                icon={Users}
                title="No employees yet"
                description="Add your first employee to get started."
                colSpan={7}
                action={{ label: 'Add Employee', onClick: () => setShowAddForm(true) }}
              />
            )}
            {filteredEmployees.length === 0 && employees.length > 0 && (
              <TableEmptyState
                icon={Users}
                title="No matching employees"
                description="Try adjusting your search or filter criteria."
                colSpan={7}
              />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
