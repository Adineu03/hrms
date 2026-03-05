'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useColdStartFeatureStore } from '@/lib/cold-start-feature-store';
import { useAuthStore } from '@/lib/auth-store';
import type { EnhancedCompanyProfileData, OrgSettingsData } from '@hrms/shared';
import {
  Loader2,
  Building2,
  Globe,
  Phone,
  MapPin,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Palette,
} from 'lucide-react';

const inputClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary appearance-none';

const COUNTRIES = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'SG', label: 'Singapore' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Germany' },
  { code: 'CA', label: 'Canada' },
  { code: 'JP', label: 'Japan' },
  { code: 'FR', label: 'France' },
];

const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (INR)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

const FISCAL_YEAR_OPTIONS = [
  { value: 'january', label: 'January' },
  { value: 'april', label: 'April' },
  { value: 'july', label: 'July' },
  { value: 'october', label: 'October' },
];

const SIZE_BRACKETS = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

export default function OrganizationTab() {
  const user = useAuthStore((s) => s.user);
  const {
    companyProfile,
    isProfileLoading,
    fetchCompanyProfile,
    saveCompanyProfile,
    orgSettings,
    isSettingsLoading,
    fetchOrgSettings,
    saveOrgSettings,
  } = useColdStartFeatureStore();

  const [profileForm, setProfileForm] = useState<EnhancedCompanyProfileData>({
    name: '',
    legalName: '',
    logoUrl: '',
    address: '',
    phone: '',
    website: '',
    brandColor: '#4F46E5',
    companySizeBracket: '',
  });

  const [settingsForm, setSettingsForm] = useState<OrgSettingsData>({
    country: 'IN',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    fiscalYearStart: 'april',
    multiEntity: false,
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyProfile();
    fetchOrgSettings();
  }, [fetchCompanyProfile, fetchOrgSettings]);

  useEffect(() => {
    if (companyProfile) {
      setProfileForm({
        name: companyProfile.name || user?.orgName || '',
        legalName: companyProfile.legalName || '',
        logoUrl: companyProfile.logoUrl || '',
        address: companyProfile.address || '',
        phone: companyProfile.phone || '',
        website: companyProfile.website || '',
        brandColor: companyProfile.brandColor || '#4F46E5',
        companySizeBracket: companyProfile.companySizeBracket || '',
      });
    } else if (user?.orgName) {
      setProfileForm((prev) => ({ ...prev, name: user.orgName }));
    }
  }, [companyProfile, user?.orgName]);

  useEffect(() => {
    if (orgSettings) {
      setSettingsForm({
        country: orgSettings.country || 'IN',
        currency: orgSettings.currency || 'INR',
        timezone: orgSettings.timezone || 'Asia/Kolkata',
        dateFormat: orgSettings.dateFormat || 'DD/MM/YYYY',
        fiscalYearStart: orgSettings.fiscalYearStart || 'april',
        multiEntity: orgSettings.multiEntity || false,
      });
    }
  }, [orgSettings]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      await saveCompanyProfile(profileForm);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      setProfileError('Failed to save company profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(false);
    try {
      await saveOrgSettings(settingsForm);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch {
      setSettingsError('Failed to save organization settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isProfileLoading || isSettingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">
          Loading organization settings...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Company Profile Section */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">
          Company Profile
        </h2>
        <p className="text-sm text-text-muted mb-5">
          Basic information about your organization.
        </p>

        {profileSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Company profile saved successfully.
          </div>
        )}
        {profileError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {profileError}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-text mb-1.5"
              >
                Company Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  id="companyName"
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                  placeholder="Your company name"
                  className={`${inputClassName} pl-10`}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="legalName"
                className="block text-sm font-medium text-text mb-1.5"
              >
                Legal Name{' '}
                <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <input
                id="legalName"
                type="text"
                value={profileForm.legalName || ''}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    legalName: e.target.value,
                  })
                }
                placeholder="Legal entity name"
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="logoUrl"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Logo URL{' '}
              <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                id="logoUrl"
                type="url"
                value={profileForm.logoUrl || ''}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, logoUrl: e.target.value })
                }
                placeholder="https://example.com/logo.png"
                className={`${inputClassName} pl-10`}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Address{' '}
              <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
              <textarea
                id="address"
                rows={2}
                value={profileForm.address || ''}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, address: e.target.value })
                }
                placeholder="123 Main Street, City, Country"
                className={`${inputClassName} pl-10 resize-none`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="companyPhone"
                className="block text-sm font-medium text-text mb-1.5"
              >
                Phone{' '}
                <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  id="companyPhone"
                  type="tel"
                  value={profileForm.phone || ''}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: e.target.value })
                  }
                  placeholder="+1 555-0100"
                  className={`${inputClassName} pl-10`}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="companyWebsite"
                className="block text-sm font-medium text-text mb-1.5"
              >
                Website{' '}
                <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  id="companyWebsite"
                  type="url"
                  value={profileForm.website || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      website: e.target.value,
                    })
                  }
                  placeholder="https://example.com"
                  className={`${inputClassName} pl-10`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="brandColor"
                className="block text-sm font-medium text-text mb-1.5"
              >
                Brand Color{' '}
                <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Palette className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    id="brandColor"
                    type="text"
                    value={profileForm.brandColor || ''}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        brandColor: e.target.value,
                      })
                    }
                    placeholder="#4F46E5"
                    className={`${inputClassName} pl-10`}
                  />
                </div>
                <input
                  type="color"
                  value={profileForm.brandColor || '#4F46E5'}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      brandColor: e.target.value,
                    })
                  }
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="companySize"
                className="block text-sm font-medium text-text mb-1.5"
              >
                Company Size
              </label>
              <select
                id="companySize"
                value={profileForm.companySizeBracket || ''}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    companySizeBracket: e.target.value,
                  })
                }
                className={selectClassName}
              >
                <option value="">Select size</option>
                {SIZE_BRACKETS.map((sb) => (
                  <option key={sb.value} value={sb.value}>
                    {sb.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Company Profile'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Divider */}
      <hr className="border-border" />

      {/* Organization Settings Section */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">
          Organization Settings
        </h2>
        <p className="text-sm text-text-muted mb-5">
          Regional and operational preferences for your organization.
        </p>

        {settingsSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Organization settings saved successfully.
          </div>
        )}
        {settingsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {settingsError}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-5 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-text mb-1.5"
              >
                Country
              </label>
              <select
                id="country"
                value={settingsForm.country || ''}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    country: e.target.value,
                  })
                }
                className={selectClassName}
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="currency"
                className="block text-sm font-medium text-text mb-1.5"
              >
                Currency
              </label>
              <select
                id="currency"
                value={settingsForm.currency || ''}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    currency: e.target.value,
                  })
                }
                className={selectClassName}
              >
                <option value="">Select currency</option>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="timezone"
                className="block text-sm font-medium text-text mb-1.5"
              >
                Timezone
              </label>
              <select
                id="timezone"
                value={settingsForm.timezone || ''}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    timezone: e.target.value,
                  })
                }
                className={selectClassName}
              >
                <option value="">Select timezone</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="dateFormat"
                className="block text-sm font-medium text-text mb-1.5"
              >
                Date Format
              </label>
              <select
                id="dateFormat"
                value={settingsForm.dateFormat || ''}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    dateFormat: e.target.value,
                  })
                }
                className={selectClassName}
              >
                {DATE_FORMATS.map((df) => (
                  <option key={df.value} value={df.value}>
                    {df.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="fiscalYearStart"
              className="block text-sm font-medium text-text mb-1.5"
            >
              Fiscal Year Starts In
            </label>
            <select
              id="fiscalYearStart"
              value={settingsForm.fiscalYearStart || ''}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  fiscalYearStart: e.target.value,
                })
              }
              className={`${selectClassName} max-w-xs`}
            >
              {FISCAL_YEAR_OPTIONS.map((fy) => (
                <option key={fy.value} value={fy.value}>
                  {fy.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={settingsForm.multiEntity || false}
              onClick={() =>
                setSettingsForm({
                  ...settingsForm,
                  multiEntity: !settingsForm.multiEntity,
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settingsForm.multiEntity ? 'bg-primary' : 'bg-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  settingsForm.multiEntity
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
            <div>
              <p className="text-sm font-medium text-text">
                Multi-Entity Mode
              </p>
              <p className="text-xs text-text-muted">
                Enable if your organization has multiple legal entities or
                subsidiaries.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Organization Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
