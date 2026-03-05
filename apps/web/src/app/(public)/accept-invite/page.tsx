'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Step = 'validating' | 'set-password' | 'personal-details' | 'welcome' | 'error';

interface InviteInfo {
  valid: boolean;
  email?: string;
  orgName?: string;
  firstName?: string;
  lastName?: string;
  expired?: boolean;
  alreadyAccepted?: boolean;
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md">
          <div className="bg-card rounded-xl border border-border p-8 shadow-sm text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-muted">Loading...</p>
          </div>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [step, setStep] = useState<Step>('validating');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!token) {
      setStep('error');
      setErrorMessage('No invitation token provided.');
      return;
    }
    async function doValidate() {
      try {
        const res = await api.get(`/cold-start/invitations/accept/${token}`);
        const data: InviteInfo = res.data;
        setInviteInfo(data);
        if (data.valid) {
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setStep('set-password');
        } else {
          setStep('error');
          if (data.expired) setErrorMessage('This invitation has expired. Please contact your administrator.');
          else if (data.alreadyAccepted) setErrorMessage('This invitation has already been accepted.');
          else setErrorMessage('This invitation is no longer valid.');
        }
      } catch (err: unknown) {
        setStep('error');
        const msg = err instanceof Error ? err.message : 'Failed to validate invitation.';
        setErrorMessage(msg);
      }
    }
    doValidate();
  }, [token]);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setErrorMessage('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setErrorMessage('Passwords do not match.'); return; }
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const res = await api.post(`/cold-start/invitations/accept/${token}`, {
        password,
        firstName: firstName.trim() || 'Employee',
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      const { tokens, user } = res.data;
      localStorage.setItem('token', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      useAuthStore.getState().loadFromStorage();
      setStep('personal-details');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept invitation.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePersonalDetails(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.patch('/cold-start/my-profile', { phone: phone.trim() || undefined });
    } catch {
      // Non-critical, continue
    }
    setStep('welcome');
  }

  function handleGoToDashboard() {
    router.push('/dashboard');
  }

  const inputClass = 'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';
  const btnClass = 'w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors';
  const stepNumber = step === 'set-password' ? 1 : step === 'personal-details' ? 2 : step === 'welcome' ? 3 : 0;

  return (
    <div className="w-full max-w-md">
      <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
        {step === 'validating' && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-muted">Validating your invitation...</p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text mb-2">Invalid Invitation</h2>
            <p className="text-text-muted mb-6">{errorMessage}</p>
            <button onClick={() => router.push('/login')} className={btnClass}>
              Go to Login
            </button>
          </div>
        )}

        {stepNumber > 0 && (
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  n <= stepNumber ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>
        )}

        {step === 'set-password' && (
          <>
            <h2 className="text-xl font-semibold text-text text-center mb-1">
              Welcome to {inviteInfo?.orgName}
            </h2>
            <p className="text-text-muted text-center text-sm mb-6">
              Set your password to get started
            </p>
            <div className="bg-background rounded-lg p-3 mb-6 text-sm">
              <span className="text-text-muted">Email: </span>
              <span className="text-text font-medium">{inviteInfo?.email}</span>
            </div>
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
                {errorMessage}
              </div>
            )}
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">First Name</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} placeholder="Your first name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} placeholder="Your last name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass + ' pr-10'}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Re-enter password" required minLength={8} />
              </div>
              <button type="submit" disabled={isSubmitting} className={btnClass}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                Set Password &amp; Continue
              </button>
            </form>
          </>
        )}

        {step === 'personal-details' && (
          <>
            <h2 className="text-xl font-semibold text-text text-center mb-1">Complete Your Profile</h2>
            <p className="text-text-muted text-center text-sm mb-6">
              Add a few more details (you can update these later)
            </p>
            <form onSubmit={handlePersonalDetails} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+91 98765 43210" />
              </div>
              <button type="submit" className={btnClass}>
                Save &amp; Continue
              </button>
              <button type="button" onClick={() => setStep('welcome')} className="w-full text-sm text-text-muted hover:text-text transition-colors py-2">
                Skip for now
              </button>
            </form>
          </>
        )}

        {step === 'welcome' && (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-text mb-2">You&apos;re All Set!</h2>
            <p className="text-text-muted mb-6">
              Welcome to {inviteInfo?.orgName}. Your account is ready.
            </p>
            <button onClick={handleGoToDashboard} className={btnClass}>
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
