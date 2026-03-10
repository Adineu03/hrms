'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Shield, Briefcase, User, KeyRound, Clock } from 'lucide-react';

interface PersonaInfo {
  persona: 'admin' | 'manager' | 'employee';
  email: string;
  sessionStatus: 'online' | 'offline';
  lastSeen: string | null;
  sessionDurationMinutes: number | null;
}

const PERSONA_CONFIG = {
  admin: {
    label: 'Admin',
    email: 'admin@demo.com',
    icon: Shield,
    color: 'text-indigo-600 bg-indigo-50',
    border: 'border-indigo-200',
  },
  manager: {
    label: 'Manager',
    email: 'manager@demo.com',
    icon: Briefcase,
    color: 'text-amber-600 bg-amber-50',
    border: 'border-amber-200',
  },
  employee: {
    label: 'Employee',
    email: 'employee@demo.com',
    icon: User,
    color: 'text-green-600 bg-green-50',
    border: 'border-green-200',
  },
};

export default function DemoPersonas() {
  const [personas, setPersonas] = useState<PersonaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resettingPersona, setResettingPersona] = useState<string | null>(null);
  const [resetMessages, setResetMessages] = useState<Record<string, string>>({});

  const fetchPersonas = () => {
    setLoading(true);
    setError('');
    api.get('/demo-company/admin/demo-personas')
      .then((r) => setPersonas(r.data.data ?? []))
      .catch(() => setError('Failed to load persona data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const handleResetPassword = async (persona: string) => {
    setResettingPersona(persona);
    setResetMessages((prev) => ({ ...prev, [persona]: '' }));
    try {
      await api.post(`/demo-company/admin/demo-personas/${persona}/reset-password`, {});
      setResetMessages((prev) => ({ ...prev, [persona]: 'Password reset successfully.' }));
    } catch {
      setResetMessages((prev) => ({ ...prev, [persona]: 'Failed to reset password.' }));
    } finally {
      setResettingPersona(null);
    }
  };

  const formatLastSeen = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const getPersonaData = (persona: 'admin' | 'manager' | 'employee') =>
    personas.find((p) => p.persona === persona);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400 text-sm">
        Loading persona data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
        <p className="text-red-600 text-sm">{error}</p>
        <button onClick={fetchPersonas} className="mt-2 text-sm text-indigo-600 hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#2c2c2c]">Demo Personas</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage the three pre-configured demo accounts for product demonstrations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(['admin', 'manager', 'employee'] as const).map((personaKey) => {
          const cfg = PERSONA_CONFIG[personaKey];
          const Icon = cfg.icon;
          const data = getPersonaData(personaKey);
          const isOnline = data?.sessionStatus === 'online';
          const message = resetMessages[personaKey];

          return (
            <div
              key={personaKey}
              className={`bg-white rounded-xl border shadow-sm p-6 flex flex-col gap-4 ${cfg.border}`}
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${cfg.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2c2c2c]">{cfg.label}</h3>
                  <p className="text-xs text-gray-500">{cfg.email}</p>
                </div>
                <div className="ml-auto">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Session Activity */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500">Last seen:</span>
                  <span className="text-[#2c2c2c] font-medium ml-auto">{formatLastSeen(data?.lastSeen ?? null)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500">Session duration:</span>
                  <span className="text-[#2c2c2c] font-medium ml-auto">
                    {formatDuration(data?.sessionDurationMinutes ?? null)}
                  </span>
                </div>
              </div>

              {/* Reset Password */}
              <div className="border-t border-gray-100 pt-4">
                {message && (
                  <p
                    className={`text-xs mb-3 px-2.5 py-1.5 rounded-lg ${
                      message.includes('successfully')
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}
                  >
                    {message}
                  </p>
                )}
                <button
                  onClick={() => handleResetPassword(personaKey)}
                  disabled={resettingPersona === personaKey}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <KeyRound className="h-4 w-4" />
                  {resettingPersona === personaKey ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <p className="text-sm text-indigo-700">
          <span className="font-semibold">Tip:</span> Share persona credentials with prospects to let them explore the platform from each role&apos;s perspective. Passwords are reset to defaults after each demo.
        </p>
      </div>
    </div>
  );
}
