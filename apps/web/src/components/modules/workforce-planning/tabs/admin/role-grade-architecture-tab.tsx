'use client';
import { useState, useEffect } from 'react';
import { Loader2, Plus, X, Layers, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

interface RoleGrade {
  id: string;
  roleTitle: string;
  jobFamily: string;
  jobFunction: string;
  gradeCode: string;
  gradeLevel: number;
  salaryRangeMin: number;
  salaryRangeMax: number;
  currency: string;
  isManagerialRole: boolean;
  employmentType?: string;
}

export default function RoleGradeArchitectureTab() {
  const [roles, setRoles] = useState<RoleGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    roleTitle: '',
    jobFamily: '',
    jobFunction: '',
    gradeCode: '',
    gradeLevel: 1,
    salaryRangeMin: 0,
    salaryRangeMax: 0,
    currency: 'INR',
    isManagerialRole: false,
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workforce-planning/admin/role-grade-architecture');
      setRoles(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load role-grade architecture');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.roleTitle || !form.gradeCode) return;
    try {
      setSubmitting(true);
      await api.post('/workforce-planning/admin/role-grade-architecture', form);
      setForm({ roleTitle: '', jobFamily: '', jobFunction: '', gradeCode: '', gradeLevel: 1, salaryRangeMin: 0, salaryRangeMax: 0, currency: 'INR', isManagerialRole: false });
      setShowForm(false);
      setSuccessMsg('Role created successfully');
      fetchRoles();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/workforce-planning/admin/role-grade-architecture/${id}`);
      fetchRoles();
    } catch {
      setError('Failed to delete role');
    }
  };

  const formatSalaryRange = (min: number, max: number, currency: string) => {
    const symbol = currency === 'INR' ? '₹' : currency;
    return `${symbol}${min.toLocaleString('en-IN')} – ${symbol}${max.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading role-grade architecture...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2c2c2c]">Role & Grade Architecture</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Role
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg">
            <h3 className="text-sm font-semibold text-[#2c2c2c] mb-3">New Role</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role Title *</label>
                <input
                  type="text"
                  value={form.roleTitle}
                  onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Job Family</label>
                <input
                  type="text"
                  value={form.jobFamily}
                  onChange={(e) => setForm({ ...form, jobFamily: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Engineering"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Job Function</label>
                <input
                  type="text"
                  value={form.jobFunction}
                  onChange={(e) => setForm({ ...form, jobFunction: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Backend Development"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grade Code *</label>
                <input
                  type="text"
                  value={form.gradeCode}
                  onChange={(e) => setForm({ ...form, gradeCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., IC4"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grade Level</label>
                <input
                  type="number"
                  value={form.gradeLevel}
                  onChange={(e) => setForm({ ...form, gradeLevel: parseInt(e.target.value) || 1 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salary Range Min</label>
                <input
                  type="number"
                  value={form.salaryRangeMin}
                  onChange={(e) => setForm({ ...form, salaryRangeMin: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salary Range Max</label>
                <input
                  type="number"
                  value={form.salaryRangeMax}
                  onChange={(e) => setForm({ ...form, salaryRangeMax: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="isManagerial"
                  checked={form.isManagerialRole}
                  onChange={(e) => setForm({ ...form, isManagerialRole: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isManagerial" className="text-sm text-gray-700">Managerial Role</label>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Role
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {roles.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No roles defined. Create your first role.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role Title</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Family</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Function</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade Code</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Level</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Salary Range</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-medium text-[#2c2c2c]">{role.roleTitle}</td>
                    <td className="py-3 px-2 text-gray-600">{role.jobFamily || '—'}</td>
                    <td className="py-3 px-2 text-gray-600">{role.jobFunction || '—'}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded font-mono text-xs bg-indigo-50 text-indigo-700">{role.gradeCode}</span>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{role.gradeLevel}</td>
                    <td className="py-3 px-2 text-gray-700 text-xs">{formatSalaryRange(role.salaryRangeMin, role.salaryRangeMax, role.currency)}</td>
                    <td className="py-3 px-2">
                      {role.isManagerialRole ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Manager</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">IC</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
