'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Users,
  Building2,
  Download,
  Search,
} from 'lucide-react';

interface TeamMember {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  department?: string;
  designation?: string;
  location?: string;
  employmentType?: string;
}

interface TeamStats {
  total: number;
  byDepartment: Record<string, number>;
}

const selectClassName =
  'px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-sm';

export default function TeamDirectoryTab() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterEmploymentType, setFilterEmploymentType] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/core-hr/manager/team');
        const data = res.data;
        const teamMembers: TeamMember[] = data.members || data || [];
        setMembers(teamMembers);

        // Calculate stats
        const byDept: Record<string, number> = {};
        teamMembers.forEach((m) => {
          const dept = m.department || 'Unassigned';
          byDept[dept] = (byDept[dept] || 0) + 1;
        });
        setStats({ total: teamMembers.length, byDepartment: byDept });
      } catch {
        setError('Failed to load team data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/core-hr/manager/team/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'team-directory.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export team data.');
    } finally {
      setIsExporting(false);
    }
  };

  // Get unique values for filter dropdowns
  const locations = [...new Set(members.map((m) => m.location).filter(Boolean))];
  const employmentTypes = [...new Set(members.map((m) => m.employmentType).filter(Boolean))];

  // Apply filters
  const filteredMembers = members.filter((m) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const fullName = `${m.firstName} ${m.lastName || ''}`.toLowerCase();
      if (!fullName.includes(query) && !m.email.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (filterLocation && m.location !== filterLocation) return false;
    if (filterEmploymentType && m.employmentType !== filterEmploymentType) return false;
    if (filterGrade) return false; // Grade filter placeholder
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading team directory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Total Members
              </span>
            </div>
            <p className="text-2xl font-bold text-text">{stats.total}</p>
          </div>
          {Object.entries(stats.byDepartment)
            .slice(0, 3)
            .map(([dept, count]) => (
              <div
                key={dept}
                className="bg-background rounded-lg p-4 border border-border"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wider truncate">
                    {dept}
                  </span>
                </div>
                <p className="text-2xl font-bold text-text">{count}</p>
              </div>
            ))}
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        {locations.length > 0 && (
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className={selectClassName}
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc!}>
                {loc}
              </option>
            ))}
          </select>
        )}
        {employmentTypes.length > 0 && (
          <select
            value={filterEmploymentType}
            onChange={(e) => setFilterEmploymentType(e.target.value)}
            className={selectClassName}
          >
            <option value="">All Types</option>
            {employmentTypes.map((t) => (
              <option key={t} value={t!}>
                {t}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </button>
      </div>

      {/* Team Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
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
                Location
              </th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                Employment Type
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredMembers.map((member) => (
              <tr
                key={member.id}
                className="bg-card hover:bg-background/50 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-text font-medium">
                  {member.firstName} {member.lastName || ''}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {member.email}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {member.department || '--'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {member.designation || '--'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {member.location || '--'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {member.employmentType || '--'}
                </td>
              </tr>
            ))}
            {filteredMembers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  {members.length === 0
                    ? 'No team members found. Team data will appear once employees are assigned to you.'
                    : 'No members match the current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
