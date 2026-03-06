'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  Star,
  Inbox,
  Users,
  Award,
} from 'lucide-react';

interface NineBoxEmployee {
  id: string;
  name: string;
  designation: string;
  performance: number; // 1-3 (low, medium, high)
  potential: number;   // 1-3 (low, medium, high)
}

interface SuccessionCandidate {
  id: string;
  name: string;
  currentRole: string;
  readinessLevel: string;
}

interface SuccessionRole {
  role: string;
  candidates: SuccessionCandidate[];
}

interface HighPotential {
  id: string;
  name: string;
  designation: string;
  rating: number;
  strengths: string[];
}

interface TalentData {
  nineBoxEmployees: NineBoxEmployee[];
  successionRoles: SuccessionRole[];
  highPotentials: HighPotential[];
}

const NINE_BOX_LABELS: Record<string, { label: string; color: string }> = {
  '3-3': { label: 'Star', color: 'bg-green-100 border-green-300 text-green-800' },
  '3-2': { label: 'High Performer', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  '3-1': { label: 'Workhouse', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  '2-3': { label: 'High Potential', color: 'bg-lime-50 border-lime-200 text-lime-700' },
  '2-2': { label: 'Core Player', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  '2-1': { label: 'Inconsistent', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  '1-3': { label: 'Enigma', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  '1-2': { label: 'Dilemma', color: 'bg-red-50 border-red-200 text-red-700' },
  '1-1': { label: 'Risk', color: 'bg-red-100 border-red-300 text-red-800' },
};

const READINESS_STYLES: Record<string, string> = {
  ready_now: 'bg-green-100 text-green-700',
  ready_1_year: 'bg-blue-100 text-blue-700',
  ready_2_years: 'bg-yellow-50 text-yellow-700',
  not_ready: 'bg-gray-100 text-gray-600',
};

export default function TalentAssessmentTab() {
  const [data, setData] = useState<TalentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/performance-growth/manager/talent');
      setData(res.data?.data || res.data);
    } catch {
      setError('Failed to load talent assessment data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading talent assessment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
      </div>
    );
  }

  const talent = data || { nineBoxEmployees: [], successionRoles: [], highPotentials: [] };

  // Build 9-box grid data
  const nineBoxGrid: Record<string, NineBoxEmployee[]> = {};
  for (let perf = 3; perf >= 1; perf--) {
    for (let pot = 1; pot <= 3; pot++) {
      nineBoxGrid[`${perf}-${pot}`] = [];
    }
  }
  (talent.nineBoxEmployees || []).forEach((emp) => {
    const key = `${emp.performance}-${emp.potential}`;
    if (nineBoxGrid[key]) {
      nineBoxGrid[key].push(emp);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Star className="h-5 w-5" />
          Talent Assessment
        </h2>
        <p className="text-sm text-text-muted">9-Box grid, succession planning, and high-potential identification.</p>
      </div>

      {/* 9-Box Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text">9-Box Talent Grid</h3>
        {talent.nineBoxEmployees.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">No talent assessment data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Y-axis label */}
            <div className="flex items-stretch">
              <div className="w-10 flex items-center justify-center">
                <span className="text-[10px] text-text-muted font-semibold uppercase -rotate-90 whitespace-nowrap">Performance</span>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-3 gap-2">
                  {/* Row 1: High Performance (3) */}
                  {[1, 2, 3].map((pot) => {
                    const key = `3-${pot}`;
                    const info = NINE_BOX_LABELS[key];
                    const emps = nineBoxGrid[key];
                    return (
                      <div key={key} className={`border rounded-xl p-3 min-h-[100px] ${info.color}`}>
                        <p className="text-[10px] font-semibold mb-1">{info.label}</p>
                        <p className="text-xs text-text-muted mb-2">{emps.length} employee(s)</p>
                        <div className="space-y-0.5">
                          {emps.slice(0, 3).map((emp) => (
                            <p key={emp.id} className="text-[10px] truncate">{emp.name}</p>
                          ))}
                          {emps.length > 3 && <p className="text-[10px] text-text-muted">+{emps.length - 3} more</p>}
                        </div>
                      </div>
                    );
                  })}
                  {/* Row 2: Medium Performance (2) */}
                  {[1, 2, 3].map((pot) => {
                    const key = `2-${pot}`;
                    const info = NINE_BOX_LABELS[key];
                    const emps = nineBoxGrid[key];
                    return (
                      <div key={key} className={`border rounded-xl p-3 min-h-[100px] ${info.color}`}>
                        <p className="text-[10px] font-semibold mb-1">{info.label}</p>
                        <p className="text-xs text-text-muted mb-2">{emps.length} employee(s)</p>
                        <div className="space-y-0.5">
                          {emps.slice(0, 3).map((emp) => (
                            <p key={emp.id} className="text-[10px] truncate">{emp.name}</p>
                          ))}
                          {emps.length > 3 && <p className="text-[10px] text-text-muted">+{emps.length - 3} more</p>}
                        </div>
                      </div>
                    );
                  })}
                  {/* Row 3: Low Performance (1) */}
                  {[1, 2, 3].map((pot) => {
                    const key = `1-${pot}`;
                    const info = NINE_BOX_LABELS[key];
                    const emps = nineBoxGrid[key];
                    return (
                      <div key={key} className={`border rounded-xl p-3 min-h-[100px] ${info.color}`}>
                        <p className="text-[10px] font-semibold mb-1">{info.label}</p>
                        <p className="text-xs text-text-muted mb-2">{emps.length} employee(s)</p>
                        <div className="space-y-0.5">
                          {emps.slice(0, 3).map((emp) => (
                            <p key={emp.id} className="text-[10px] truncate">{emp.name}</p>
                          ))}
                          {emps.length > 3 && <p className="text-[10px] text-text-muted">+{emps.length - 3} more</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* X-axis label */}
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <p className="text-center text-[10px] text-text-muted font-semibold uppercase">Low Potential</p>
                  <p className="text-center text-[10px] text-text-muted font-semibold uppercase">Medium Potential</p>
                  <p className="text-center text-[10px] text-text-muted font-semibold uppercase">High Potential</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Succession Planning */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Users className="h-4 w-4" />
            Succession Planning
          </h3>
          {(talent.successionRoles || []).length === 0 ? (
            <div className="text-center py-8 bg-background border border-border rounded-xl">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted">No succession plans defined.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {talent.successionRoles.map((role, idx) => (
                <div key={idx} className="bg-background border border-border rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-text mb-2">{role.role}</h4>
                  {role.candidates.length === 0 ? (
                    <p className="text-xs text-text-muted italic">No candidates identified.</p>
                  ) : (
                    <div className="space-y-2">
                      {role.candidates.map((candidate) => (
                        <div key={candidate.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                          <div>
                            <span className="text-sm text-text font-medium">{candidate.name}</span>
                            <p className="text-xs text-text-muted">{candidate.currentRole}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${READINESS_STYLES[candidate.readinessLevel] || 'bg-gray-100 text-gray-600'}`}>
                            {candidate.readinessLevel?.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* High Potentials */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Award className="h-4 w-4" />
            High-Potential Employees
          </h3>
          {(talent.highPotentials || []).length === 0 ? (
            <div className="text-center py-8 bg-background border border-border rounded-xl">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted">No high-potential employees identified.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {talent.highPotentials.map((hp) => (
                <div key={hp.id} className="bg-background border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-text">{hp.name}</h4>
                      <p className="text-xs text-text-muted">{hp.designation}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-sm font-semibold text-text">{hp.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  {hp.strengths?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {hp.strengths.map((s, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
