'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Route,
  Inbox,
  ChevronDown,
  ChevronRight,
  Check,
  Square,
  Clock,
  Download,
  Award,
} from 'lucide-react';

interface LearningPathItem {
  id: string;
  title: string;
  type: string;
  isCompleted: boolean;
  dueDate: string;
  duration: number;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  completionPercent: number;
  totalItems: number;
  completedItems: number;
  totalDuration: number;
  remainingDuration: number;
  isCertificateAvailable: boolean;
  items: LearningPathItem[];
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  not_started: 'bg-gray-100 text-gray-600',
};

export default function MyLearningPathTab() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [expandedPathId, setExpandedPathId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/learning-development/employee/learning-paths');
      setPaths(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError('Failed to load learning paths.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkItemComplete = async (pathId: string, itemId: string) => {
    try {
      await api.patch(`/learning-development/employee/learning-paths/${pathId}/items/${itemId}`, {
        isCompleted: true,
      });
      setSuccess('Item marked as complete.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to mark item as complete.');
    }
  };

  const handleDownloadCertificate = async (pathId: string) => {
    try {
      const res = await api.get(`/learning-development/employee/learning-paths/${pathId}/certificate`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${pathId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download certificate.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedPathId(expandedPathId === id ? null : id);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading learning paths...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <Route className="h-5 w-5" />
          My Learning Paths
        </h2>
        <p className="text-sm text-text-muted">Track your progress through assigned and chosen learning paths.</p>
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

      {paths.length === 0 ? (
        <div className="text-center py-8">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No learning paths assigned or enrolled yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paths.map((path) => (
            <div key={path.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-background/50 transition-colors"
                onClick={() => toggleExpand(path.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {expandedPathId === path.id ? (
                    <ChevronDown className="h-4 w-4 text-text-muted flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-text">{path.title}</h4>
                    {path.description && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{path.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${path.completionPercent >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                          style={{ width: `${path.completionPercent || 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-text">{path.completionPercent || 0}%</span>
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {path.completedItems}/{path.totalItems} items
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[path.status] || 'bg-gray-100 text-gray-600'}`}>
                    {path.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedPathId === path.id && (
                <div className="border-t border-border px-5 py-4 bg-background/30">
                  {/* Path Meta */}
                  <div className="flex items-center gap-4 mb-4 text-xs text-text-muted">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Total: {formatDuration(path.totalDuration || 0)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Remaining: {formatDuration(path.remainingDuration || 0)}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 mb-4">
                    {(path.items || []).map((item) => (
                      <div key={item.id} className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!item.isCompleted) handleMarkItemComplete(path.id, item.id);
                          }}
                          className="flex-shrink-0"
                          disabled={item.isCompleted}
                        >
                          {item.isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Square className="h-4 w-4 text-text-muted hover:text-primary transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm ${item.isCompleted ? 'text-text-muted line-through' : 'text-text'}`}>
                            {item.title}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-text-muted capitalize">{item.type}</span>
                            {item.duration > 0 && (
                              <span className="text-[10px] text-text-muted">{formatDuration(item.duration)}</span>
                            )}
                            {item.dueDate && (
                              <span className="text-[10px] text-text-muted">Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        {item.isCompleted && (
                          <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                    {(path.items || []).length === 0 && (
                      <p className="text-xs text-text-muted italic text-center py-2">No items in this learning path.</p>
                    )}
                  </div>

                  {/* Certificate download */}
                  {path.isCertificateAvailable && path.completionPercent >= 100 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadCertificate(path.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Certificate
                    </button>
                  )}
                  {path.completionPercent >= 100 && !path.isCertificateAvailable && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <Award className="h-3.5 w-3.5" />
                      Path completed! Certificate pending.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
