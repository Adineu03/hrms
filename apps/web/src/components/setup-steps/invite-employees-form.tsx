'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { Loader2, CheckCircle2, Plus, X, Mail, ClipboardPaste } from 'lucide-react';

interface InviteEmployeesFormProps {
  onComplete: () => void;
}

export default function InviteEmployeesForm({ onComplete }: InviteEmployeesFormProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;

    if (!isValidEmail(trimmed)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (emails.includes(trimmed)) {
      setValidationError('This email has already been added.');
      return;
    }

    setEmails([...emails, trimmed]);
    setEmailInput('');
    setValidationError(null);
  };

  const addAllFromPaste = () => {
    const raw = pasteText.trim();
    if (!raw) return;

    // Split by commas, semicolons, or newlines
    const parsed = raw
      .split(/[,;\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    const valid: string[] = [];
    const invalid: string[] = [];

    parsed.forEach((e) => {
      if (!isValidEmail(e)) {
        invalid.push(e);
      } else if (!emails.includes(e) && !valid.includes(e)) {
        valid.push(e);
      }
    });

    if (valid.length > 0) {
      setEmails([...emails, ...valid]);
    }

    setPasteText('');
    setShowPasteArea(false);

    if (invalid.length > 0) {
      setValidationError(`${invalid.length} invalid email(s) were skipped: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '...' : ''}`);
    } else {
      setValidationError(null);
    }
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (emails.length === 0) {
      setError('Please add at least one email address.');
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      await api.post('/cold-start/invite-employees', { emails });
      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 800);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Failed to send invitations.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Mark step complete without sending invites
      onComplete();
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName =
    'w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary';

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CheckCircle2 className="h-10 w-10 text-accent mb-3" />
        <p className="text-text font-medium">Invitations sent!</p>
        <p className="text-sm text-text-muted mt-1">
          {emails.length} employee(s) will receive an invitation email.
        </p>
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
      {validationError && (
        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
          {validationError}
        </div>
      )}

      {/* Single Email Input */}
      <div>
        <label htmlFor="emailInput" className="block text-sm font-medium text-text mb-1.5">
          Add Employee Email
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              id="emailInput"
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setValidationError(null);
              }}
              placeholder="employee@company.com"
              className={`${inputClassName} pl-10`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addEmail();
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={addEmail}
            disabled={!emailInput.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Paste Emails Section */}
      <div>
        <button
          type="button"
          onClick={() => setShowPasteArea(!showPasteArea)}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          {showPasteArea ? 'Hide paste area' : 'Paste multiple emails'}
        </button>

        {showPasteArea && (
          <div className="mt-3 space-y-2">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste emails separated by commas, semicolons, or new lines"
              rows={4}
              className={`${inputClassName} resize-none`}
            />
            <button
              type="button"
              onClick={addAllFromPaste}
              disabled={!pasteText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add All
            </button>
          </div>
        )}
      </div>

      {/* Email List */}
      {emails.length > 0 && (
        <div>
          <p className="text-sm font-medium text-text mb-2">
            {emails.length} email(s) to invite
          </p>
          <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            <ul className="divide-y divide-border">
              {emails.map((email) => (
                <li
                  key={email}
                  className="flex items-center justify-between px-4 py-2.5 bg-card hover:bg-background/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <span className="text-sm text-text truncate">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving || emails.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            `Send ${emails.length} Invitation${emails.length !== 1 ? 's' : ''}`
          )}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isSaving}
          className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-text hover:bg-background disabled:opacity-50 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}
