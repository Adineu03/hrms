'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { CompanyProfileData } from '@hrms/shared';
import { Loader2, CheckCircle2, Building2, Globe, Phone, MapPin, Image as ImageIcon } from 'lucide-react';

interface CompanyProfileFormProps {
  onComplete: () => void;
}

export default function CompanyProfileForm({ onComplete }: CompanyProfileFormProps) {
  const user = useAuthStore((s) => s.user);
  const [formData, setFormData] = useState<CompanyProfileData>({
    name: user?.orgName || '',
    logoUrl: '',
    address: '',
    phone: '',
    website: '',
  });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get<CompanyProfileData>('/cold-start/company-profile');
        if (res.data) {
          setFormData({
            name: res.data.name || user?.orgName || '',
            logoUrl: res.data.logoUrl || '',
            address: res.data.address || '',
            phone: res.data.phone || '',
            website: res.data.website || '',
          });
        }
      } catch {
        // No existing data — use defaults, which is fine
      } finally {
        setIsLoadingData(false);
      }
    }
    loadProfile();
  }, [user?.orgName]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      await api.post('/cold-start/company-profile', formData);
      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 800);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Failed to save company profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName =
    'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading company profile...</span>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CheckCircle2 className="h-10 w-10 text-accent mb-3" />
        <p className="text-text font-medium">Company profile saved!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Company Name */}
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-text mb-1.5">
          Company Name
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            id="companyName"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Your company name"
            className={`${inputClassName} pl-10`}
          />
        </div>
      </div>

      {/* Logo URL */}
      <div>
        <label htmlFor="logoUrl" className="block text-sm font-medium text-text mb-1.5">
          Logo URL <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <div className="relative">
          <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            id="logoUrl"
            type="url"
            value={formData.logoUrl || ''}
            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
            className={`${inputClassName} pl-10`}
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-text mb-1.5">
          Address <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
          <textarea
            id="address"
            rows={3}
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Main Street, City, Country"
            className={`${inputClassName} pl-10 resize-none`}
          />
        </div>
      </div>

      {/* Phone & Website Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-text mb-1.5">
            Phone <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              id="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 555-0100"
              className={`${inputClassName} pl-10`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-text mb-1.5">
            Website <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              id="website"
              type="url"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
              className={`${inputClassName} pl-10`}
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Continue'
          )}
        </button>
      </div>
    </form>
  );
}
