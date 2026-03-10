'use client';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, X, GitBranch } from 'lucide-react';
import { api } from '@/lib/api';

interface CareerPath {
  id: string;
  roleTitle: string;
  gradeCode: string;
  jobFamily?: string;
  progressionPath?: string;
}

interface MyRole {
  roleTitle?: string;
  gradeCode?: string;
  gradeLevel?: number;
  jobFamily?: string;
  jobFunction?: string;
}

interface SkillGap {
  targetRole?: string;
  gaps?: string[];
}

export default function CareerPathExplorerTab() {
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [myRole, setMyRole] = useState<MyRole | null>(null);
  const [skillsGap, setSkillsGap] = useState<SkillGap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pathsRes, roleRes, gapRes] = await Promise.allSettled([
        api.get('/workforce-planning/employee/career-path'),
        api.get('/workforce-planning/employee/my-role'),
        api.get('/workforce-planning/employee/skills-gap'),
      ]);
      if (pathsRes.status === 'fulfilled') setCareerPaths(pathsRes.value.data?.data || pathsRes.value.data || []);
      if (roleRes.status === 'fulfilled') setMyRole(roleRes.value.data?.data || roleRes.value.data || null);
      if (gapRes.status === 'fulfilled') setSkillsGap(gapRes.value.data?.data || gapRes.value.data || null);
    } catch {
      setError('Failed to load career path data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading career path...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {myRole && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#2c2c2c] mb-4 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-600" />
            My Current Role
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Role Title</p>
              <p className="text-sm font-semibold text-[#2c2c2c]">{myRole.roleTitle || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Grade Code</p>
              <span className="px-2 py-0.5 rounded font-mono text-xs bg-indigo-50 text-indigo-700">{myRole.gradeCode || '—'}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Job Family</p>
              <p className="text-sm text-[#2c2c2c]">{myRole.jobFamily || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Job Function</p>
              <p className="text-sm text-[#2c2c2c]">{myRole.jobFunction || '—'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-4">Career Path Options</h2>
        {careerPaths.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No career path options found for your current role.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role Title</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade Code</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Family</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Progression Path</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {careerPaths.map((path) => (
                  <tr key={path.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 font-medium text-[#2c2c2c]">{path.roleTitle}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded font-mono text-xs bg-indigo-50 text-indigo-700">{path.gradeCode}</span>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{path.jobFamily || '—'}</td>
                    <td className="py-3 px-2 text-gray-600 text-xs">{path.progressionPath || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {skillsGap && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#2c2c2c] mb-1">Skills Gap Analysis</h2>
          {skillsGap.targetRole && (
            <p className="text-sm text-gray-500 mb-4">Target role: <span className="font-medium text-[#2c2c2c]">{skillsGap.targetRole}</span></p>
          )}
          {skillsGap.gaps && skillsGap.gaps.length > 0 ? (
            <div className="space-y-2">
              {skillsGap.gaps.map((gap, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                  <span className="text-sm text-[#2c2c2c]">{gap}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No skill gaps identified.</p>
          )}
        </div>
      )}
    </div>
  );
}
