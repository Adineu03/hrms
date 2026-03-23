'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Plus,
  X,
  Inbox,
  Calendar,
  FileText,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface ExitInterview {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  scheduledDate: string | null;
  conductedDate: string | null;
  status: string;
  themes: string[];
  overallRating: number | null;
  notes: string;
}

interface DepartingEmployee {
  id: string;
  name: string;
  department: string;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
};

const THEME_OPTIONS = [
  'Work environment', 'Management', 'Career growth', 'Compensation',
  'Work-life balance', 'Team dynamics', 'Company culture', 'Training & development',
];

const defaultScheduleForm = {
  employeeId: '',
  scheduledDate: '',
  scheduledTime: '10:00',
};

const defaultResponseForm = {
  themes: [] as string[],
  overallRating: 3,
  notes: '',
};

export default function ExitInterviewTab() {
  const [interviews, setInterviews] = useState<ExitInterview[]>([]);
  const [departingEmployees, setDepartingEmployees] = useState<DepartingEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(defaultScheduleForm);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<ExitInterview | null>(null);
  const [responseForm, setResponseForm] = useState(defaultResponseForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [interviewRes, departingRes] = await Promise.all([
        api.get('/onboarding-offboarding/manager/exit-interviews').catch(() => ({ data: [] })),
        api.get('/onboarding-offboarding/manager/departing-employees').catch(() => ({ data: [] })),
      ]);
      const interviewData = interviewRes.data;
      setInterviews(Array.isArray(interviewData) ? interviewData : interviewData?.data ?? []);
      const departingData = departingRes.data;
      setDepartingEmployees(Array.isArray(departingData) ? departingData : departingData?.data ?? []);
    } catch {
      setError('Failed to load exit interviews.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSchedule = async () => {
    setError(null);
    if (!scheduleForm.employeeId || !scheduleForm.scheduledDate) {
      setError('Employee and date are required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/onboarding-offboarding/manager/exit-interviews', {
        employeeId: scheduleForm.employeeId,
        scheduledDate: `${scheduleForm.scheduledDate}T${scheduleForm.scheduledTime}:00`,
      });
      setSuccess('Exit interview scheduled.');
      setShowScheduleForm(false);
      setScheduleForm(defaultScheduleForm);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to schedule interview.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordResponse = async () => {
    if (!selectedInterview) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.post(`/onboarding-offboarding/manager/exit-interviews/${selectedInterview.id}/complete`, responseForm);
      setSuccess('Interview responses recorded.');
      setShowResponseForm(false);
      setSelectedInterview(null);
      setResponseForm(defaultResponseForm);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to record responses.');
    } finally {
      setIsSaving(false);
    }
  };

  const openRecordResponse = (interview: ExitInterview) => {
    setSelectedInterview(interview);
    setResponseForm({
      themes: interview.themes || [],
      overallRating: interview.overallRating || 3,
      notes: interview.notes || '',
    });
    setShowResponseForm(true);
  };

  const toggleTheme = (theme: string) => {
    setResponseForm((prev) => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter((t) => t !== theme)
        : [...prev.themes, theme],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading exit interviews...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Exit Interview Management
        </h2>
        <p className="text-sm text-text-muted">Schedule exit interviews and record feedback themes.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button type="button" onClick={() => { setScheduleForm(defaultScheduleForm); setShowScheduleForm(true); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          Schedule Interview
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Employee</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Scheduled</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Themes</th>
              <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {interviews.map((iv) => (
              <tr key={iv.id} className="bg-card hover:bg-background/50 transition-colors">
                <td className="px-4 py-3 text-sm text-text font-medium">{iv.employeeName}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{iv.department}</td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {iv.scheduledDate ? new Date(iv.scheduledDate).toLocaleDateString() : '--'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[iv.status] || 'bg-gray-100 text-gray-600'}`}>
                    {iv.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(iv.themes || []).slice(0, 2).map((t) => (
                      <span key={t} className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-[10px]">{t}</span>
                    ))}
                    {(iv.themes || []).length > 2 && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">+{iv.themes.length - 2}</span>
                    )}
                    {(iv.themes || []).length === 0 && <span className="text-xs text-text-muted">--</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {iv.status === 'scheduled' && (
                    <button
                      type="button"
                      onClick={() => openRecordResponse(iv)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                    >
                      <FileText className="h-3 w-3" />
                      Record
                    </button>
                  )}
                  {iv.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => openRecordResponse(iv)}
                      className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary font-medium transition-colors"
                    >
                      <FileText className="h-3 w-3" />
                      View
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {interviews.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No exit interviews scheduled.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Schedule Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Schedule Exit Interview</h3>
              <button type="button" onClick={() => setShowScheduleForm(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Employee *</label>
                <select value={scheduleForm.employeeId} onChange={(e) => setScheduleForm({ ...scheduleForm, employeeId: e.target.value })} className={selectClassName}>
                  <option value="">Select departing employee</option>
                  {departingEmployees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.department})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Date *</label>
                  <input type="date" value={scheduleForm.scheduledDate} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })} className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Time</label>
                  <input type="time" value={scheduleForm.scheduledTime} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledTime: e.target.value })} className={inputClassName} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleSchedule} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <Calendar className="h-4 w-4" />
                Schedule
              </button>
              <button type="button" onClick={() => setShowScheduleForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Response Modal */}
      {showResponseForm && selectedInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">
                Exit Interview — {selectedInterview.employeeName}
              </h3>
              <button type="button" onClick={() => { setShowResponseForm(false); setSelectedInterview(null); }} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2">Key Themes (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => toggleTheme(theme)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        responseForm.themes.includes(theme)
                          ? 'bg-primary text-white'
                          : 'bg-background border border-border text-text-muted hover:text-text'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Overall Rating (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setResponseForm({ ...responseForm, overallRating: rating })}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        responseForm.overallRating === rating
                          ? 'bg-primary text-white'
                          : 'bg-background border border-border text-text-muted hover:text-text'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
                <textarea
                  value={responseForm.notes}
                  onChange={(e) => setResponseForm({ ...responseForm, notes: e.target.value })}
                  className={`${inputClassName} min-h-[100px]`}
                  placeholder="Record interview feedback and key takeaways..."
                  rows={5}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleRecordResponse} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Responses
              </button>
              <button type="button" onClick={() => { setShowResponseForm(false); setSelectedInterview(null); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
