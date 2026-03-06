'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Inbox,
  Plus,
  X,
  Check,
  Square,
  Award,
  BookOpen,
  Send,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface Activity {
  id: string;
  title: string;
  type: string;
  status: string;
  isCompleted: boolean;
  dueDate: string;
}

interface IdpPlan {
  id: string;
  title: string;
  progress: number;
  status: string;
  activities: Activity[];
  startDate: string;
  endDate: string;
}

interface Certification {
  id: string;
  name: string;
  issuingOrg: string;
  issueDate: string;
  expiryDate: string;
  credentialId: string;
}

interface SkillSelfAssessment {
  id: string;
  skillName: string;
  currentLevel: string;
  targetLevel: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  not_started: 'bg-gray-100 text-gray-600',
};

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export default function DevelopmentPlanTab() {
  const [plan, setPlan] = useState<IdpPlan | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [skills, setSkills] = useState<SkillSelfAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add activity form
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState({ title: '', type: 'course', dueDate: '' });

  // Add certification form
  const [showCertForm, setShowCertForm] = useState(false);
  const [certForm, setCertForm] = useState({ name: '', issuingOrg: '', issueDate: '', expiryDate: '', credentialId: '' });

  // Career aspiration
  const [aspiration, setAspiration] = useState('');
  const [aspirationSaved, setAspirationSaved] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [planRes, certRes, skillRes, aspirationRes] = await Promise.all([
        api.get('/performance-growth/employee/development/plan'),
        api.get('/performance-growth/employee/development/certifications'),
        api.get('/performance-growth/employee/development/skills'),
        api.get('/performance-growth/employee/development/aspiration'),
      ]);
      setPlan(planRes.data?.data || planRes.data);
      setCertifications(Array.isArray(certRes.data) ? certRes.data : certRes.data?.data || []);
      setSkills(Array.isArray(skillRes.data) ? skillRes.data : skillRes.data?.data || []);
      setAspiration(aspirationRes.data?.aspiration || aspirationRes.data?.data?.aspiration || '');
    } catch {
      setError('Failed to load development plan.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleActivity = async (activityId: string, isCompleted: boolean) => {
    try {
      await api.patch(`/performance-growth/employee/development/activities/${activityId}`, {
        isCompleted: !isCompleted,
      });
      loadData();
    } catch {
      setError('Failed to update activity.');
    }
  };

  const handleAddActivity = async () => {
    if (!activityForm.title.trim()) {
      setError('Activity title is required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/performance-growth/employee/development/activities', activityForm);
      setSuccess('Activity added.');
      setShowActivityForm(false);
      setActivityForm({ title: '', type: 'course', dueDate: '' });
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to add activity.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCertification = async () => {
    if (!certForm.name.trim()) {
      setError('Certification name is required.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/performance-growth/employee/development/certifications', certForm);
      setSuccess('Certification added.');
      setShowCertForm(false);
      setCertForm({ name: '', issuingOrg: '', issueDate: '', expiryDate: '', credentialId: '' });
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to add certification.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSkillLevel = async (skillId: string, level: string) => {
    try {
      await api.patch(`/performance-growth/employee/development/skills/${skillId}`, { currentLevel: level });
      loadData();
    } catch {
      setError('Failed to update skill level.');
    }
  };

  const handleSaveAspiration = async () => {
    try {
      await api.put('/performance-growth/employee/development/aspiration', { aspiration });
      setAspirationSaved(true);
      setTimeout(() => setAspirationSaved(false), 3000);
    } catch {
      setError('Failed to save aspiration.');
    }
  };

  const handleRequestTraining = async () => {
    try {
      await api.post('/performance-growth/employee/development/training-request');
      setSuccess('Training request submitted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to submit training request.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading development plan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Development Plan
        </h2>
        <p className="text-sm text-text-muted">Manage your individual development plan, certifications, and skills.</p>
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

      {/* Current IDP */}
      {plan ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text">{plan.title}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[plan.status] || 'bg-gray-100 text-gray-600'}`}>
              {plan.status?.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-muted">Progress</span>
              <span className="text-xs font-medium text-text">{plan.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${plan.progress || 0}%` }} />
            </div>
          </div>

          {/* Activities */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted uppercase">Activities</span>
              <button
                type="button"
                onClick={() => setShowActivityForm(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Activity
              </button>
            </div>
            {(plan.activities || []).length === 0 ? (
              <p className="text-xs text-text-muted italic">No activities defined yet.</p>
            ) : (
              plan.activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 bg-background rounded-lg px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActivity(activity.id, activity.isCompleted)}
                    className="flex-shrink-0"
                  >
                    {activity.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Square className="h-4 w-4 text-text-muted hover:text-primary transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${activity.isCompleted ? 'text-text-muted line-through' : 'text-text'}`}>
                      {activity.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-text-muted capitalize">{activity.type}</span>
                      {activity.dueDate && <span className="text-[10px] text-text-muted">Due: {new Date(activity.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={handleRequestTraining}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Request Training
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No development plan assigned yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <Award className="h-4 w-4" />
              Certifications
            </h3>
            <button
              type="button"
              onClick={() => setShowCertForm(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
          {certifications.length === 0 ? (
            <div className="text-center py-6 bg-background border border-border rounded-xl">
              <Award className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted">No certifications logged.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {certifications.map((cert) => (
                <div key={cert.id} className="bg-card border border-border rounded-lg px-4 py-3">
                  <h4 className="text-sm text-text font-medium">{cert.name}</h4>
                  <p className="text-xs text-text-muted">{cert.issuingOrg}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
                    <span>Issued: {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : '--'}</span>
                    {cert.expiryDate && <span>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>}
                    {cert.credentialId && <span>ID: {cert.credentialId}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skills Self-Assessment */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Skills Self-Assessment
          </h3>
          {skills.length === 0 ? (
            <div className="text-center py-6 bg-background border border-border rounded-xl">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted">No skills to assess.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {skills.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
                  <div>
                    <span className="text-sm text-text font-medium">{skill.skillName}</span>
                    <p className="text-[10px] text-text-muted">Target: {skill.targetLevel}</p>
                  </div>
                  <select
                    value={skill.currentLevel}
                    onChange={(e) => handleUpdateSkillLevel(skill.id, e.target.value)}
                    className={`${selectClassName} !w-32`}
                  >
                    {SKILL_LEVELS.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Career Aspiration */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text mb-2">Career Aspiration Note</h3>
        <textarea
          value={aspiration}
          onChange={(e) => setAspiration(e.target.value)}
          className={`${inputClassName} min-h-[80px]`}
          placeholder="Where do you see yourself in 2-5 years? What roles or skills interest you?"
          rows={3}
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={handleSaveAspiration}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            Save
          </button>
          {aspirationSaved && <span className="text-xs text-green-600">Saved!</span>}
        </div>
      </div>

      {/* Add Activity Modal */}
      {showActivityForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Add Activity</h3>
              <button type="button" onClick={() => setShowActivityForm(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Title *</label>
                <input type="text" value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} className={inputClassName} placeholder="e.g. Complete React Advanced Course" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
                <select value={activityForm.type} onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })} className={selectClassName}>
                  <option value="course">Online Course</option>
                  <option value="training">Training</option>
                  <option value="mentorship">Mentorship</option>
                  <option value="project">Project</option>
                  <option value="reading">Reading</option>
                  <option value="certification">Certification Prep</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Due Date</label>
                <input type="date" value={activityForm.dueDate} onChange={(e) => setActivityForm({ ...activityForm, dueDate: e.target.value })} className={inputClassName} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleAddActivity} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Activity
              </button>
              <button type="button" onClick={() => setShowActivityForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Certification Modal */}
      {showCertForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Add Certification</h3>
              <button type="button" onClick={() => setShowCertForm(false)} className="text-text-muted hover:text-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Name *</label>
                <input type="text" value={certForm.name} onChange={(e) => setCertForm({ ...certForm, name: e.target.value })} className={inputClassName} placeholder="e.g. AWS Solutions Architect" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Issuing Organization</label>
                <input type="text" value={certForm.issuingOrg} onChange={(e) => setCertForm({ ...certForm, issuingOrg: e.target.value })} className={inputClassName} placeholder="e.g. Amazon Web Services" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Issue Date</label>
                  <input type="date" value={certForm.issueDate} onChange={(e) => setCertForm({ ...certForm, issueDate: e.target.value })} className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Expiry Date</label>
                  <input type="date" value={certForm.expiryDate} onChange={(e) => setCertForm({ ...certForm, expiryDate: e.target.value })} className={inputClassName} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Credential ID</label>
                <input type="text" value={certForm.credentialId} onChange={(e) => setCertForm({ ...certForm, credentialId: e.target.value })} className={inputClassName} placeholder="Certificate ID" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button type="button" onClick={handleAddCertification} disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Certification
              </button>
              <button type="button" onClick={() => setShowCertForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
