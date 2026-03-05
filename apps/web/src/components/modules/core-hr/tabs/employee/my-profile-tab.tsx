'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  User,
  Phone,
  Mail,
  Calendar,
  Shield,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Building2,
  Briefcase,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  personalEmail: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  emergencyContacts: EmergencyContact[];
  bankDetails: BankDetails | null;
  dateOfJoining: string;
  department: string;
  designation: string;
  grade: string;
  manager: string;
}

interface CompletenessData {
  percentage: number;
  missing: string[];
}

type SectionId = 'personal' | 'contact' | 'emergency' | 'bank';

export default function MyProfileTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessData | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('personal');

  // Personal info form
  const [personalForm, setPersonalForm] = useState({
    phone: '',
    personalEmail: '',
    dateOfBirth: '',
    gender: '',
    address: '',
  });

  // Emergency contacts
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

  // Bank details
  const [bankForm, setBankForm] = useState<BankDetails>({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
  });

  useEffect(() => {
    fetchProfile();
    fetchCompleteness();
  }, []);

  useEffect(() => {
    if (profile) {
      setPersonalForm({
        phone: profile.phone || '',
        personalEmail: profile.personalEmail || '',
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || '',
        address: profile.address || '',
      });
      setEmergencyContacts(profile.emergencyContacts || []);
      setBankForm({
        bankName: profile.bankDetails?.bankName || '',
        accountNumber: profile.bankDetails?.accountNumber || '',
        ifscCode: profile.bankDetails?.ifscCode || '',
        branchName: profile.bankDetails?.branchName || '',
      });
    }
  }, [profile]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/core-hr/employee/profile');
      setProfile(res.data);
    } catch {
      setError('Failed to load profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompleteness = async () => {
    try {
      const res = await api.get('/core-hr/employee/profile/completeness');
      setCompleteness(res.data);
    } catch {
      // Non-critical, silently fail
    }
  };

  const showSuccess = (message: string) => {
    setSaveSuccess(message);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleSavePersonal = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await api.patch('/core-hr/employee/profile', personalForm);
      showSuccess('Personal information updated.');
      fetchCompleteness();
    } catch {
      setError('Failed to save personal information.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEmergency = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await api.patch('/core-hr/employee/profile', { emergencyContacts });
      showSuccess('Emergency contacts updated.');
      fetchCompleteness();
    } catch {
      setError('Failed to save emergency contacts.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBank = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await api.patch('/core-hr/employee/profile', { bankDetails: bankForm });
      showSuccess('Bank details updated.');
      fetchCompleteness();
    } catch {
      setError('Failed to save bank details.');
    } finally {
      setIsSaving(false);
    }
  };

  const addEmergencyContact = () => {
    setEmergencyContacts([...emergencyContacts, { name: '', relation: '', phone: '' }]);
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: string) => {
    const updated = [...emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    setEmergencyContacts(updated);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted">Loading your profile...</span>
      </div>
    );
  }

  const sections = [
    { id: 'personal' as const, label: 'Personal Info', icon: User },
    { id: 'contact' as const, label: 'Contact Details', icon: Phone },
    { id: 'emergency' as const, label: 'Emergency Contacts', icon: Shield },
    { id: 'bank' as const, label: 'Bank Details', icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Completeness Bar */}
      {completeness && (
        <div className="bg-background rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text">Profile Completeness</h3>
            <span className="text-sm font-semibold text-primary">{completeness.percentage}%</span>
          </div>
          <div className="w-full bg-card rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${completeness.percentage}%` }}
            />
          </div>
          {completeness.missing.length > 0 && (
            <p className="text-xs text-text-muted mt-2">
              Missing: {completeness.missing.join(', ')}
            </p>
          )}
          {completeness.percentage === 100 && (
            <p className="text-sm text-green-700 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Your profile is complete.
            </p>
          )}
        </div>
      )}

      {/* Employment Summary (read-only) */}
      {profile && (
        <div className="bg-background rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Employment Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-text-muted">Date of Joining</p>
              <p className="text-sm font-medium text-text">
                {profile.dateOfJoining
                  ? new Date(profile.dateOfJoining).toLocaleDateString()
                  : '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Department</p>
              <p className="text-sm font-medium text-text">{profile.department || '--'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Designation</p>
              <p className="text-sm font-medium text-text">{profile.designation || '--'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Grade</p>
              <p className="text-sm font-medium text-text">{profile.grade || '--'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Manager</p>
              <p className="text-sm font-medium text-text">{profile.manager || '--'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {saveSuccess}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Section Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text hover:border-border'
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Personal Info Section */}
      {activeSection === 'personal' && (
        <form onSubmit={handleSavePersonal} className="space-y-5 max-w-lg">
          <h3 className="text-lg font-semibold text-text mb-4">Personal Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">First Name</label>
              <input
                type="text"
                value={profile?.firstName || ''}
                disabled
                className={`${inputClassName} opacity-60 cursor-not-allowed`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Last Name</label>
              <input
                type="text"
                value={profile?.lastName || ''}
                disabled
                className={`${inputClassName} opacity-60 cursor-not-allowed`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className={`${inputClassName} pl-10 opacity-60 cursor-not-allowed`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-text mb-1.5">
              Gender
            </label>
            <select
              id="gender"
              value={personalForm.gender}
              onChange={(e) => setPersonalForm({ ...personalForm, gender: e.target.value })}
              className={selectClassName}
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-text mb-1.5">
              Date of Birth
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                id="dateOfBirth"
                type="date"
                value={personalForm.dateOfBirth}
                onChange={(e) => setPersonalForm({ ...personalForm, dateOfBirth: e.target.value })}
                className={`${inputClassName} pl-10`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-text mb-1.5">
              Address <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="address"
              rows={2}
              value={personalForm.address}
              onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
              placeholder="Full address"
              className={`${inputClassName} resize-none`}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Personal Info'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Contact Details Section */}
      {activeSection === 'contact' && (
        <form onSubmit={handleSavePersonal} className="space-y-5 max-w-lg">
          <h3 className="text-lg font-semibold text-text mb-4">Contact Details</h3>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-text mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                id="phone"
                type="tel"
                value={personalForm.phone}
                onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className={`${inputClassName} pl-10`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="personalEmail" className="block text-sm font-medium text-text mb-1.5">
              Personal Email <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                id="personalEmail"
                type="email"
                value={personalForm.personalEmail}
                onChange={(e) =>
                  setPersonalForm({ ...personalForm, personalEmail: e.target.value })
                }
                placeholder="personal@email.com"
                className={`${inputClassName} pl-10`}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Contact Details'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Emergency Contacts Section */}
      {activeSection === 'emergency' && (
        <form onSubmit={handleSaveEmergency} className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Emergency Contacts</h3>
            <button
              type="button"
              onClick={addEmergencyContact}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Contact
            </button>
          </div>

          {emergencyContacts.length === 0 && (
            <div className="text-center py-8">
              <Shield className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">No emergency contacts added yet.</p>
              <p className="text-xs text-text-muted mt-1">
                Add at least one emergency contact for safety.
              </p>
            </div>
          )}

          {emergencyContacts.map((contact, index) => (
            <div key={index} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text">Contact {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeEmergencyContact(index)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove contact"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={contact.name}
                    onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                    placeholder="Full name"
                    className={`${inputClassName} text-sm`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Relation
                  </label>
                  <input
                    type="text"
                    required
                    value={contact.relation}
                    onChange={(e) => updateEmergencyContact(index, 'relation', e.target.value)}
                    placeholder="e.g. Spouse, Parent"
                    className={`${inputClassName} text-sm`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={contact.phone}
                    onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className={`${inputClassName} text-sm`}
                  />
                </div>
              </div>
            </div>
          ))}

          {emergencyContacts.length > 0 && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Emergency Contacts'
                )}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Bank Details Section */}
      {activeSection === 'bank' && (
        <form onSubmit={handleSaveBank} className="space-y-5 max-w-lg">
          <h3 className="text-lg font-semibold text-text mb-4">Bank Details</h3>
          <p className="text-sm text-text-muted -mt-2">
            Your bank details are used for salary disbursement. This information is encrypted and
            only visible to HR administrators.
          </p>

          <div>
            <label htmlFor="bankName" className="block text-sm font-medium text-text mb-1.5">
              Bank Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                id="bankName"
                type="text"
                value={bankForm.bankName}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                placeholder="e.g. State Bank of India"
                className={`${inputClassName} pl-10`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="accountNumber" className="block text-sm font-medium text-text mb-1.5">
              Account Number
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                id="accountNumber"
                type="text"
                value={bankForm.accountNumber}
                onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                placeholder="Enter account number"
                className={`${inputClassName} pl-10`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ifscCode" className="block text-sm font-medium text-text mb-1.5">
                IFSC Code
              </label>
              <input
                id="ifscCode"
                type="text"
                value={bankForm.ifscCode}
                onChange={(e) =>
                  setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })
                }
                placeholder="e.g. SBIN0001234"
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="branchName" className="block text-sm font-medium text-text mb-1.5">
                Branch Name
              </label>
              <input
                id="branchName"
                type="text"
                value={bankForm.branchName}
                onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                placeholder="e.g. Koramangala Branch"
                className={inputClassName}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Bank Details'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
