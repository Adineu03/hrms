'use client';
import { useState, useEffect } from 'react';
import { Loader2, X, AlertCircle, GraduationCap, Clock, Award, Download, Play, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface Training {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'expired';
  score?: number;
  completedDate?: string;
  startedDate?: string;
  description?: string;
  estimatedDuration?: number;
}

interface Certificate {
  id: string;
  trainingId: string;
  trainingTitle: string;
  issuedDate: string;
  expiryDate?: string;
  score: number;
  downloadUrl?: string;
}

const statusColors: Record<string, string> = {
  assigned: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
};

const categoryColors: Record<string, string> = {
  safety: 'bg-orange-100 text-orange-700',
  compliance: 'bg-indigo-100 text-indigo-700',
  data_privacy: 'bg-purple-100 text-purple-700',
  ethics: 'bg-teal-100 text-teal-700',
  it_security: 'bg-blue-100 text-blue-700',
  hr: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function MandatoryTrainingTrackerTab() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [overdueTrainings, setOverdueTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeSection, setActiveSection] = useState<'trainings' | 'certificates'>('trainings');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [trainRes, certRes, overdueRes] = await Promise.all([
        api.get('/compliance-audit/employee/mandatory-training'),
        api.get('/compliance-audit/employee/mandatory-training/certificates'),
        api.get('/compliance-audit/employee/mandatory-training/overdue'),
      ]);
      setTrainings(trainRes.data?.data || trainRes.data || []);
      setCertificates(certRes.data?.data || certRes.data || []);
      setOverdueTrainings(overdueRes.data?.data || overdueRes.data || []);
    } catch {
      setError('Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await api.patch(`/compliance-audit/employee/mandatory-training/${id}/start`);
      fetchAll();
    } catch {
      setError('Failed to start training');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      setCompletingId(id);
      const score = scoreInput[id] ? parseInt(scoreInput[id]) : undefined;
      await api.patch(`/compliance-audit/employee/mandatory-training/${id}/complete`, { score });
      setSuccessMsg('Training marked as complete!');
      setCompletingId(null);
      fetchAll();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Failed to complete training');
      setCompletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-500">Loading training data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Overdue Banner */}
      {overdueTrainings.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-red-600" />
            <p className="text-sm font-semibold text-red-800">Overdue Trainings</p>
          </div>
          <div className="space-y-1">
            {overdueTrainings.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <span className="text-xs text-red-700">{t.title}</span>
                <span className="text-xs text-red-600 font-medium">Due: {new Date(t.dueDate).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveSection('trainings')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'trainings' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            My Trainings
          </button>
          <button
            onClick={() => setActiveSection('certificates')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'certificates' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Certificates ({certificates.length})
          </button>
        </div>

        {activeSection === 'trainings' && (
          <>
            {trainings.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No mandatory trainings assigned.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trainings.map((training) => (
                  <div key={training.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-[#2c2c2c]">{training.title}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[training.status]}`}>
                            {training.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[training.category] || 'bg-gray-100 text-gray-700'}`}>
                            {training.category.replace('_', ' ')}
                          </span>
                          {training.estimatedDuration && (
                            <span className="text-xs text-gray-500">{training.estimatedDuration} min</span>
                          )}
                          <span className="text-xs text-gray-400">•</span>
                          <span className={`text-xs ${training.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            Due: {new Date(training.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        {training.score != null && (
                          <p className="text-xs text-green-600 mt-1">Score: {training.score}%</p>
                        )}
                        {training.completedDate && (
                          <p className="text-xs text-gray-400 mt-0.5">Completed: {new Date(training.completedDate).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    {training.description && (
                      <p className="text-sm text-gray-600 mb-3">{training.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {training.status === 'assigned' && (
                        <button
                          onClick={() => handleStart(training.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Start Training
                        </button>
                      )}
                      {(training.status === 'in_progress' || training.status === 'overdue') && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Score (0-100)"
                            value={scoreInput[training.id] || ''}
                            onChange={(e) => setScoreInput({ ...scoreInput, [training.id]: e.target.value })}
                            className="border border-gray-300 rounded-lg px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            min={0}
                            max={100}
                          />
                          <button
                            onClick={() => handleComplete(training.id)}
                            disabled={completingId === training.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {completingId === training.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            Mark Complete
                          </button>
                        </div>
                      )}
                      {training.status === 'completed' && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeSection === 'certificates' && (
          <>
            {certificates.length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No certificates earned yet. Complete trainings to earn certificates.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certificates.map((cert) => (
                  <div key={cert.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 bg-yellow-50 rounded-lg">
                        <Award className="w-5 h-5 text-yellow-600" />
                      </div>
                      {cert.downloadUrl && (
                        <button className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      )}
                    </div>
                    <p className="font-medium text-[#2c2c2c] text-sm mt-2">{cert.trainingTitle}</p>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-gray-500">Issued: {new Date(cert.issuedDate).toLocaleDateString()}</p>
                      {cert.expiryDate && (
                        <p className="text-xs text-gray-500">Expires: {new Date(cert.expiryDate).toLocaleDateString()}</p>
                      )}
                      <p className="text-xs font-medium text-green-600">Score: {cert.score}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
