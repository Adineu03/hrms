'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { WorkWeekData, DepartmentData } from '@hrms/shared';
import { Loader2, Calendar, Clock, Globe, AlertCircle } from 'lucide-react';

const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WORK_MODELS = [
  { value: 'office', label: 'Office' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
  { value: 'field', label: 'Field' },
];

interface DepartmentWorkModel {
  departmentId: string;
  workModel: string;
}

export default function PoliciesTab() {
  const [workWeek, setWorkWeek] = useState<WorkWeekData | null>(null);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [departmentModels, setDepartmentModels] = useState<
    DepartmentWorkModel[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [wwRes, deptRes] = await Promise.all([
          api.get<WorkWeekData>('/cold-start/work-week'),
          api.get<DepartmentData[]>('/cold-start/departments'),
        ]);
        if (wwRes.data) {
          setWorkWeek(wwRes.data);
        }
        if (deptRes.data && Array.isArray(deptRes.data)) {
          setDepartments(deptRes.data);
          // Initialize default work models
          setDepartmentModels(
            deptRes.data.map((d) => ({
              departmentId: d.id || '',
              workModel: 'office',
            })),
          );
        }
      } catch {
        // Data may not exist yet
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const updateDepartmentModel = (deptId: string, model: string) => {
    setDepartmentModels((prev) =>
      prev.map((dm) =>
        dm.departmentId === deptId ? { ...dm, workModel: model } : dm,
      ),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.post('/cold-start/policies', {
        departmentWorkModels: departmentModels,
      });
      setSuccessMessage('Policies saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to save policies.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">
          Loading policies...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Work Week Summary */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">
          Work Week Configuration
        </h2>
        <p className="text-sm text-text-muted mb-5">
          Current work week settings for your organization. To modify, go to
          the Organization tab.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
            {successMessage}
          </div>
        )}

        {workWeek ? (
          <div className="bg-background rounded-lg border border-border p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-text">
                    Working Days
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((day) => {
                    const isWorkDay = workWeek.days.includes(day);
                    return (
                      <span
                        key={day}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          isWorkDay
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'bg-background text-text-muted border border-border'
                        }`}
                      >
                        {day}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-text">
                    Working Hours
                  </span>
                </div>
                <p className="text-sm text-text-muted">
                  {workWeek.startTime} to {workWeek.endTime}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {workWeek.days.length} days/week
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-text">
                    Timezone
                  </span>
                </div>
                <p className="text-sm text-text-muted">
                  {workWeek.timezone}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-background rounded-lg border border-border p-6 text-center">
            <p className="text-sm text-text-muted">
              Work week not configured yet. Complete the setup wizard to
              configure your work week.
            </p>
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* Department Work Models */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">
          Department Work Models
        </h2>
        <p className="text-sm text-text-muted mb-5">
          Set the default work model for each department.
        </p>

        {departments.length === 0 ? (
          <div className="bg-background rounded-lg border border-border p-6 text-center">
            <p className="text-sm text-text-muted">
              No departments configured. Add departments in the Departments
              tab first.
            </p>
          </div>
        ) : (
          <>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                      Department
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-48">
                      Work Model
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {departments.map((dept) => {
                    const model = departmentModels.find(
                      (dm) => dm.departmentId === dept.id,
                    );
                    return (
                      <tr
                        key={dept.id || dept.name}
                        className="bg-card hover:bg-background/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-text font-medium">
                          {dept.name}
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={model?.workModel || 'office'}
                            onChange={(e) =>
                              updateDepartmentModel(
                                dept.id || '',
                                e.target.value,
                              )
                            }
                            className={`${selectClassName} text-sm`}
                          >
                            {WORK_MODELS.map((wm) => (
                              <option key={wm.value} value={wm.value}>
                                {wm.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Policies'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
