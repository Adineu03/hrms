'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Save,
  Plus,
  X,
  FileText,
  Link as LinkIcon,
  GraduationCap,
  Briefcase,
  MapPin,
  Eye,
  Star,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface ResumeEntry {
  id: string;
  name: string;
  url: string;
  uploadedDate: string;
  isDefault: boolean;
}

interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  year: string;
  field: string;
}

interface PortfolioLink {
  id: string;
  url: string;
  label: string;
}

interface CareerProfile {
  summary: string;
  skills: string[];
  preferences: {
    rolesInterestedIn: string[];
    salaryExpectation: number | null;
    currency: string;
    preferredLocations: string[];
    remotePreference: string;
  };
  visibility: string;
  resumes: ResumeEntry[];
  education: EducationEntry[];
  portfolio: PortfolioLink[];
}

const defaultProfile: CareerProfile = {
  summary: '',
  skills: [],
  preferences: {
    rolesInterestedIn: [],
    salaryExpectation: null,
    currency: 'USD',
    preferredLocations: [],
    remotePreference: 'any',
  },
  visibility: 'not_looking',
  resumes: [],
  education: [],
  portfolio: [],
};

export default function CareerProfileTab() {
  const [profile, setProfile] = useState<CareerProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Section saving states
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [savingEducation, setSavingEducation] = useState(false);
  const [savingPortfolio, setSavingPortfolio] = useState(false);

  // Skill input
  const [newSkill, setNewSkill] = useState('');

  // Preference tags input
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('');

  // Resume form
  const [showResumeForm, setShowResumeForm] = useState(false);
  const [newResumeName, setNewResumeName] = useState('');
  const [newResumeUrl, setNewResumeUrl] = useState('');
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);

  // Education form
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [newEducation, setNewEducation] = useState({ degree: '', institution: '', year: '', field: '' });

  // Portfolio form
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({ url: '', label: '' });

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    skills: true,
    preferences: true,
    visibility: true,
    resumes: true,
    education: false,
    portfolio: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/talent-acquisition/employee/profile');
      const data = res.data?.data || res.data;
      if (data) {
        setProfile({
          summary: data.summary || '',
          skills: data.skills || [],
          preferences: {
            rolesInterestedIn: data.preferences?.rolesInterestedIn || [],
            salaryExpectation: data.preferences?.salaryExpectation ?? null,
            currency: data.preferences?.currency || 'USD',
            preferredLocations: data.preferences?.preferredLocations || [],
            remotePreference: data.preferences?.remotePreference || 'any',
          },
          visibility: data.visibility || 'not_looking',
          resumes: data.resumes || [],
          education: data.education || [],
          portfolio: data.portfolio || [],
        });
      }
    } catch {
      setError('Failed to load career profile.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Save Summary
  const handleSaveSummary = async () => {
    setSavingSummary(true);
    setError(null);
    try {
      await api.patch('/talent-acquisition/employee/profile', { summary: profile.summary });
      showSuccessMsg('Professional summary updated.');
    } catch {
      setError('Failed to save summary.');
    } finally {
      setSavingSummary(false);
    }
  };

  // Save Skills
  const handleAddSkill = () => {
    const skill = newSkill.trim();
    if (!skill || profile.skills.includes(skill)) return;
    setProfile((prev) => ({ ...prev, skills: [...prev.skills, skill] }));
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    setProfile((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  };

  const handleSaveSkills = async () => {
    setSavingSkills(true);
    setError(null);
    try {
      await api.patch('/talent-acquisition/employee/profile', { skills: profile.skills });
      showSuccessMsg('Skills updated.');
    } catch {
      setError('Failed to save skills.');
    } finally {
      setSavingSkills(false);
    }
  };

  // Save Preferences
  const handleAddRole = () => {
    const role = newRole.trim();
    if (!role || profile.preferences.rolesInterestedIn.includes(role)) return;
    setProfile((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, rolesInterestedIn: [...prev.preferences.rolesInterestedIn, role] },
    }));
    setNewRole('');
  };

  const handleRemoveRole = (role: string) => {
    setProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        rolesInterestedIn: prev.preferences.rolesInterestedIn.filter((r) => r !== role),
      },
    }));
  };

  const handleAddLocation = () => {
    const loc = newLocation.trim();
    if (!loc || profile.preferences.preferredLocations.includes(loc)) return;
    setProfile((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, preferredLocations: [...prev.preferences.preferredLocations, loc] },
    }));
    setNewLocation('');
  };

  const handleRemoveLocation = (loc: string) => {
    setProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        preferredLocations: prev.preferences.preferredLocations.filter((l) => l !== loc),
      },
    }));
  };

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    setError(null);
    try {
      await api.patch('/talent-acquisition/employee/profile/preferences', profile.preferences);
      showSuccessMsg('Job preferences updated.');
    } catch {
      setError('Failed to save preferences.');
    } finally {
      setSavingPreferences(false);
    }
  };

  // Save Visibility
  const handleSaveVisibility = async () => {
    setSavingVisibility(true);
    setError(null);
    try {
      await api.patch('/talent-acquisition/employee/profile/visibility', {
        visibility: profile.visibility,
      });
      showSuccessMsg('Visibility updated.');
    } catch {
      setError('Failed to save visibility.');
    } finally {
      setSavingVisibility(false);
    }
  };

  // Resume management
  const handleAddResume = async () => {
    if (!newResumeName.trim() || !newResumeUrl.trim()) {
      setError('Please provide both a name and URL for the resume.');
      return;
    }
    setIsUploadingResume(true);
    setError(null);
    try {
      const res = await api.post('/talent-acquisition/employee/profile/resume', {
        name: newResumeName.trim(),
        url: newResumeUrl.trim(),
      });
      const created = res.data?.data || res.data;
      setProfile((prev) => ({ ...prev, resumes: [...prev.resumes, created] }));
      setNewResumeName('');
      setNewResumeUrl('');
      setShowResumeForm(false);
      showSuccessMsg('Resume added.');
    } catch {
      setError('Failed to add resume.');
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    setDeletingResumeId(resumeId);
    setError(null);
    try {
      await api.delete(`/talent-acquisition/employee/profile/resume/${resumeId}`);
      setProfile((prev) => ({ ...prev, resumes: prev.resumes.filter((r) => r.id !== resumeId) }));
      showSuccessMsg('Resume removed.');
    } catch {
      setError('Failed to delete resume.');
    } finally {
      setDeletingResumeId(null);
    }
  };

  const handleSetDefaultResume = async (resumeId: string) => {
    try {
      await api.patch(`/talent-acquisition/employee/profile/resume/${resumeId}`, { isDefault: true });
      setProfile((prev) => ({
        ...prev,
        resumes: prev.resumes.map((r) => ({ ...r, isDefault: r.id === resumeId })),
      }));
      showSuccessMsg('Default resume updated.');
    } catch {
      setError('Failed to set default resume.');
    }
  };

  // Education management
  const handleAddEducation = () => {
    if (!newEducation.degree.trim() || !newEducation.institution.trim()) {
      setError('Please provide degree and institution.');
      return;
    }
    const entry: EducationEntry = {
      id: `temp-${Date.now()}`,
      degree: newEducation.degree.trim(),
      institution: newEducation.institution.trim(),
      year: newEducation.year.trim(),
      field: newEducation.field.trim(),
    };
    setProfile((prev) => ({ ...prev, education: [...prev.education, entry] }));
    setNewEducation({ degree: '', institution: '', year: '', field: '' });
    setShowEducationForm(false);
  };

  const handleRemoveEducation = (id: string) => {
    setProfile((prev) => ({ ...prev, education: prev.education.filter((e) => e.id !== id) }));
  };

  const handleSaveEducation = async () => {
    setSavingEducation(true);
    setError(null);
    try {
      await api.patch('/talent-acquisition/employee/profile', { education: profile.education });
      showSuccessMsg('Education updated.');
    } catch {
      setError('Failed to save education.');
    } finally {
      setSavingEducation(false);
    }
  };

  // Portfolio management
  const handleAddPortfolio = () => {
    if (!newPortfolio.url.trim()) {
      setError('Please provide a URL.');
      return;
    }
    const entry: PortfolioLink = {
      id: `temp-${Date.now()}`,
      url: newPortfolio.url.trim(),
      label: newPortfolio.label.trim() || newPortfolio.url.trim(),
    };
    setProfile((prev) => ({ ...prev, portfolio: [...prev.portfolio, entry] }));
    setNewPortfolio({ url: '', label: '' });
    setShowPortfolioForm(false);
  };

  const handleRemovePortfolio = (id: string) => {
    setProfile((prev) => ({ ...prev, portfolio: prev.portfolio.filter((p) => p.id !== id) }));
  };

  const handleSavePortfolio = async () => {
    setSavingPortfolio(true);
    setError(null);
    try {
      await api.patch('/talent-acquisition/employee/profile', { portfolio: profile.portfolio });
      showSuccessMsg('Portfolio updated.');
    } catch {
      setError('Failed to save portfolio.');
    } finally {
      setSavingPortfolio(false);
    }
  };

  const SectionHeader = ({
    sectionKey,
    icon: Icon,
    title,
  }: {
    sectionKey: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between py-2"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-text">{title}</h3>
      </div>
      {expandedSections[sectionKey] ? (
        <ChevronUp className="h-4 w-4 text-text-muted" />
      ) : (
        <ChevronDown className="h-4 w-4 text-text-muted" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading career profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <User className="h-5 w-5" />
          Career Profile
        </h2>
        <p className="text-sm text-text-muted">Manage your career profile visible to recruiters.</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* 1. Professional Summary */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader sectionKey="summary" icon={User} title="Professional Summary" />
        {expandedSections.summary && (
          <div className="mt-3 space-y-3">
            <textarea
              value={profile.summary}
              onChange={(e) => setProfile((prev) => ({ ...prev, summary: e.target.value }))}
              placeholder="Write a brief professional summary..."
              rows={4}
              className={`${inputClassName} resize-none`}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveSummary}
                disabled={savingSummary}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {savingSummary ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Skills */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader sectionKey="skills" icon={Star} title="Skills" />
        {expandedSections.skills && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                placeholder="Add a skill..."
                className={`${inputClassName} max-w-xs`}
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveSkills}
                disabled={savingSkills}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {savingSkills ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Skills
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Job Preferences */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader sectionKey="preferences" icon={Briefcase} title="Job Preferences" />
        {expandedSections.preferences && (
          <div className="mt-3 space-y-4">
            {/* Roles Interested In */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Roles Interested In</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {profile.preferences.rolesInterestedIn.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700"
                  >
                    {role}
                    <button type="button" onClick={() => handleRemoveRole(role)} className="hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                  placeholder="Add a role..."
                  className={`${inputClassName} max-w-xs`}
                />
                <button
                  type="button"
                  onClick={handleAddRole}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Salary + Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Salary Expectation</label>
                <input
                  type="number"
                  value={profile.preferences.salaryExpectation ?? ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        salaryExpectation: e.target.value ? parseFloat(e.target.value) : null,
                      },
                    }))
                  }
                  placeholder="e.g., 80000"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Currency</label>
                <select
                  value={profile.preferences.currency}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      preferences: { ...prev.preferences, currency: e.target.value },
                    }))
                  }
                  className={selectClassName}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>

            {/* Preferred Locations */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Preferred Locations</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {profile.preferences.preferredLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700"
                  >
                    <MapPin className="h-3 w-3" />
                    {loc}
                    <button type="button" onClick={() => handleRemoveLocation(loc)} className="hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocation())}
                  placeholder="Add a location..."
                  className={`${inputClassName} max-w-xs`}
                />
                <button
                  type="button"
                  onClick={handleAddLocation}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Remote Preference */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Remote Preference</label>
              <select
                value={profile.preferences.remotePreference}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    preferences: { ...prev.preferences, remotePreference: e.target.value },
                  }))
                }
                className={`${selectClassName} max-w-xs`}
              >
                <option value="on_site">On-Site</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="any">Any</option>
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {savingPreferences ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Visibility */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader sectionKey="visibility" icon={Eye} title="Visibility" />
        {expandedSections.visibility && (
          <div className="mt-3 space-y-3">
            <div className="space-y-2">
              {[
                { value: 'active', label: 'Active', desc: 'Actively looking for new opportunities' },
                { value: 'passive', label: 'Passive', desc: 'Open to opportunities but not actively searching' },
                { value: 'not_looking', label: 'Not Looking', desc: 'Not interested in new roles at this time' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-background cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={profile.visibility === opt.value}
                    onChange={(e) => setProfile((prev) => ({ ...prev, visibility: e.target.value }))}
                    className="mt-0.5 w-4 h-4 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-text">{opt.label}</span>
                    <p className="text-xs text-text-muted">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveVisibility}
                disabled={savingVisibility}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {savingVisibility ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Resume Versions */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader sectionKey="resumes" icon={FileText} title="Resume Versions" />
        {expandedSections.resumes && (
          <div className="mt-3 space-y-3">
            {profile.resumes.length > 0 ? (
              <div className="space-y-2">
                {profile.resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-text-muted flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">{resume.name}</p>
                        <p className="text-xs text-text-muted">
                          Uploaded {new Date(resume.uploadedDate).toLocaleDateString()}
                        </p>
                      </div>
                      {resume.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 flex-shrink-0">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!resume.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultResume(resume.id)}
                          className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteResume(resume.id)}
                        disabled={deletingResumeId === resume.id}
                        className="p-1 text-text-muted hover:text-red-600 transition-colors"
                      >
                        {deletingResumeId === resume.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No resumes uploaded yet.</p>
            )}

            {showResumeForm ? (
              <div className="p-3 border border-border rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Name *</label>
                    <input
                      type="text"
                      value={newResumeName}
                      onChange={(e) => setNewResumeName(e.target.value)}
                      placeholder="e.g., Software Engineer Resume"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">URL *</label>
                    <input
                      type="url"
                      value={newResumeUrl}
                      onChange={(e) => setNewResumeUrl(e.target.value)}
                      placeholder="https://..."
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddResume}
                    disabled={isUploadingResume}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                  >
                    {isUploadingResume ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Add Resume
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResumeForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowResumeForm(true)}
                className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Resume
              </button>
            )}
          </div>
        )}
      </div>

      {/* 6. Education */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader sectionKey="education" icon={GraduationCap} title="Education" />
        {expandedSections.education && (
          <div className="mt-3 space-y-3">
            {profile.education.length > 0 ? (
              <div className="space-y-2">
                {profile.education.map((edu) => (
                  <div
                    key={edu.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium text-text">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                      <p className="text-xs text-text-muted">{edu.institution}{edu.year ? ` (${edu.year})` : ''}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(edu.id)}
                      className="p-1 text-text-muted hover:text-red-600 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No education entries added yet.</p>
            )}

            {showEducationForm ? (
              <div className="p-3 border border-border rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Degree *</label>
                    <input
                      type="text"
                      value={newEducation.degree}
                      onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
                      placeholder="e.g., Bachelor of Science"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Institution *</label>
                    <input
                      type="text"
                      value={newEducation.institution}
                      onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
                      placeholder="e.g., MIT"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Field of Study</label>
                    <input
                      type="text"
                      value={newEducation.field}
                      onChange={(e) => setNewEducation({ ...newEducation, field: e.target.value })}
                      placeholder="e.g., Computer Science"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Year</label>
                    <input
                      type="text"
                      value={newEducation.year}
                      onChange={(e) => setNewEducation({ ...newEducation, year: e.target.value })}
                      placeholder="e.g., 2022"
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddEducation}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEducationForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowEducationForm(true)}
                className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Education
              </button>
            )}

            {profile.education.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveEducation}
                  disabled={savingEducation}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {savingEducation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Education
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. Portfolio */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader sectionKey="portfolio" icon={LinkIcon} title="Portfolio" />
        {expandedSections.portfolio && (
          <div className="mt-3 space-y-3">
            {profile.portfolio.length > 0 ? (
              <div className="space-y-2">
                {profile.portfolio.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:text-primary-hover truncate"
                      >
                        {link.label || link.url}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePortfolio(link.id)}
                      className="p-1 text-text-muted hover:text-red-600 transition-colors flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No portfolio links added yet.</p>
            )}

            {showPortfolioForm ? (
              <div className="p-3 border border-border rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">URL *</label>
                    <input
                      type="url"
                      value={newPortfolio.url}
                      onChange={(e) => setNewPortfolio({ ...newPortfolio, url: e.target.value })}
                      placeholder="https://..."
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Label</label>
                    <input
                      type="text"
                      value={newPortfolio.label}
                      onChange={(e) => setNewPortfolio({ ...newPortfolio, label: e.target.value })}
                      placeholder="e.g., GitHub, Portfolio Site"
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddPortfolio}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPortfolioForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPortfolioForm(true)}
                className="text-sm text-primary hover:text-primary-hover font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Link
              </button>
            )}

            {profile.portfolio.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePortfolio}
                  disabled={savingPortfolio}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {savingPortfolio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Portfolio
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
