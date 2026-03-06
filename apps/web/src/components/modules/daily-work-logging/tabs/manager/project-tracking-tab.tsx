'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  FolderKanban,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Inbox,
} from 'lucide-react';

interface ProjectSummary {
  id: string;
  name: string;
  budgetHours: number;
  actualHours: number;
  billableHours: number;
  utilization: number;
  status: string;
}

interface ProjectMember {
  employeeId: string;
  employeeName: string;
  hours: number;
  billableHours: number;
  role: string;
}

interface BillableSummary {
  totalBillable: number;
  totalNonBillable: number;
  billableRatio: number;
}

export default function ProjectTrackingTab() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [billable, setBillable] = useState<BillableSummary>({ totalBillable: 0, totalNonBillable: 0, billableRatio: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [memberMap, setMemberMap] = useState<Record<string, ProjectMember[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [projRes, billRes] = await Promise.all([
        api.get('/daily-work-logging/manager/projects'),
        api.get('/daily-work-logging/manager/projects/billable'),
      ]);
      setProjects(Array.isArray(projRes.data) ? projRes.data : projRes.data?.data || []);
      const billData = billRes.data?.data || billRes.data;
      if (billData) {
        setBillable({
          totalBillable: billData.totalBillable || 0,
          totalNonBillable: billData.totalNonBillable || 0,
          billableRatio: billData.billableRatio || 0,
        });
      }
    } catch {
      setError('Failed to load project tracking data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMembers = async (projectId: string) => {
    if (expandedId === projectId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(projectId);
    if (memberMap[projectId]) return;

    setLoadingMembers(projectId);
    try {
      const res = await api.get(`/daily-work-logging/manager/projects/${projectId}/members`);
      setMemberMap((prev) => ({
        ...prev,
        [projectId]: Array.isArray(res.data) ? res.data : res.data?.data || [],
      }));
    } catch {
      setMemberMap((prev) => ({ ...prev, [projectId]: [] }));
    } finally {
      setLoadingMembers(null);
    }
  };

  const renderProgressBar = (percent: number, color: string = 'bg-primary') => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading project tracking...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          Project Tracking
        </h2>
        <p className="text-sm text-text-muted">Track budget vs actual hours and team member breakdown per project.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Billable Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-700 uppercase tracking-wider">Billable Hours</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{billable.totalBillable.toFixed(1)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">Non-Billable Hours</span>
          </div>
          <p className="text-2xl font-bold text-gray-600">{billable.totalNonBillable.toFixed(1)}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wider">Billable Ratio</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{billable.billableRatio.toFixed(0)}%</p>
        </div>
      </div>

      {/* Project Cards */}
      <div className="space-y-3">
        {projects.map((project) => (
          <div key={project.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-background/50 transition-colors"
              onClick={() => loadMembers(project.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-text">{project.name}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {project.status}
                  </span>
                </div>
                {expandedId === project.id ? (
                  <ChevronUp className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
                <div>
                  <span className="text-xs text-text-muted">Budget</span>
                  <p className="font-medium text-text">{project.budgetHours.toFixed(0)}h</p>
                </div>
                <div>
                  <span className="text-xs text-text-muted">Actual</span>
                  <p className="font-medium text-text">{project.actualHours.toFixed(1)}h</p>
                </div>
                <div>
                  <span className="text-xs text-text-muted">Billable</span>
                  <p className="font-medium text-green-700">{project.billableHours.toFixed(1)}h</p>
                </div>
                <div>
                  <span className="text-xs text-text-muted">Utilization</span>
                  <p className="font-medium text-text">{project.utilization.toFixed(0)}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  {renderProgressBar(
                    project.utilization,
                    project.utilization > 100 ? 'bg-red-500' : project.utilization > 80 ? 'bg-yellow-500' : 'bg-primary'
                  )}
                </div>
                <span className="text-xs font-medium text-text-muted">{project.utilization.toFixed(0)}%</span>
              </div>
            </div>

            {expandedId === project.id && (
              <div className="border-t border-border px-4 py-3 bg-background/30">
                {loadingMembers === project.id ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
                    <span className="text-xs text-text-muted">Loading team members...</span>
                  </div>
                ) : (memberMap[project.id] || []).length > 0 ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-background border-b border-border">
                          <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Member</th>
                          <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Role</th>
                          <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Hours</th>
                          <th className="text-left text-[10px] font-semibold text-text-muted uppercase px-3 py-2">Billable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {memberMap[project.id].map((m) => (
                          <tr key={m.employeeId} className="bg-card">
                            <td className="px-3 py-1.5 text-xs text-text font-medium">{m.employeeName}</td>
                            <td className="px-3 py-1.5 text-xs text-text-muted">{m.role}</td>
                            <td className="px-3 py-1.5 text-xs text-text-muted">{m.hours.toFixed(1)}</td>
                            <td className="px-3 py-1.5 text-xs text-green-700">{m.billableHours.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted py-2">No team members assigned to this project.</p>
                )}
              </div>
            )}
          </div>
        ))}

        {projects.length === 0 && (
          <div className="text-center py-8">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">No projects found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
