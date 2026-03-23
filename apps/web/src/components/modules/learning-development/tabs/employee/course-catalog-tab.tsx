'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Inbox,
  Filter,
  Clock,
  Star,
  Bookmark,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

const selectClassName =
  'w-full px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary appearance-none';

interface Course {
  id: string;
  title: string;
  description: string;
  type: string;
  format: string;
  provider: string;
  externalUrl: string;
  duration: number;
  difficulty: string;
  skills: string[];
  isMandatory: boolean;
  rating: number;
  enrollmentCount: number;
  isEnrolled: boolean;
  isBookmarked: boolean;
  whatYouLearn: string[];
  thumbnailUrl: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-orange-100 text-orange-700',
  expert: 'bg-red-100 text-red-700',
};

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

const FORMAT_OPTIONS = [
  { value: 'all', label: 'All Formats' },
  { value: 'video', label: 'Video' },
  { value: 'slides', label: 'Slides' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'document', label: 'Document' },
  { value: 'interactive', label: 'Interactive' },
];

export default function CourseCatalogTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/learning-development/employee/catalog').catch(() => ({ data: [] }));
      const raw = res.data;
      setCourses(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch {
      setError('Failed to load course catalog.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEnroll = async (courseId: string) => {
    setError(null);
    try {
      await api.post(`/learning-development/employee/catalog/${courseId}/enroll`);
      setSuccess('Successfully enrolled in course.');
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to enroll in course.');
    }
  };

  const handleBookmark = async (courseId: string, isBookmarked: boolean) => {
    try {
      if (isBookmarked) {
        await api.delete(`/learning-development/employee/catalog/${courseId}/bookmark`);
      } else {
        await api.post(`/learning-development/employee/catalog/${courseId}/bookmark`);
      }
      loadData();
    } catch {
      setError('Failed to update bookmark.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCourseId(expandedCourseId === id ? null : id);
  };

  const filteredCourses = courses.filter((course) => {
    if (difficultyFilter !== 'all' && course.difficulty !== difficultyFilter) return false;
    if (formatFilter !== 'all' && course.format !== formatFilter) return false;
    if (skillFilter && !(course.skills || []).some((s) => s.toLowerCase().includes(skillFilter.toLowerCase()))) return false;
    return true;
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < Math.round(rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading course catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Course Catalog
        </h2>
        <p className="text-sm text-text-muted">Explore available courses and enroll to start learning.</p>
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-text-muted" />
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className={`${selectClassName} !w-auto`}
        >
          {DIFFICULTY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          className={`${selectClassName} !w-auto`}
        >
          {FORMAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="relative">
          <input
            type="text"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            placeholder="Filter by skill..."
            className="px-3 py-2 border border-border rounded-lg bg-white text-text text-sm focus:ring-2 focus:ring-primary focus:border-primary w-44"
          />
          {skillFilter && (
            <button
              type="button"
              onClick={() => setSkillFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-8">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">No courses found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              {/* Thumbnail Placeholder */}
              <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <BookOpen className="h-10 w-10 text-primary/30" />
              </div>

              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-text line-clamp-2 flex-1">{course.title}</h4>
                  <button
                    type="button"
                    onClick={() => handleBookmark(course.id, course.isBookmarked)}
                    className="ml-2 flex-shrink-0 text-text-muted hover:text-primary transition-colors"
                  >
                    <Bookmark className={`h-4 w-4 ${course.isBookmarked ? 'fill-primary text-primary' : ''}`} />
                  </button>
                </div>

                {course.provider && (
                  <p className="text-xs text-text-muted capitalize mb-1">{course.provider.replace(/_/g, ' ')}</p>
                )}

                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-text-muted" />
                    <span className="text-xs text-text-muted">{course.duration ? `${course.duration} min` : '--'}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${DIFFICULTY_COLORS[course.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                    {course.difficulty}
                  </span>
                  {course.isMandatory && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                      Required
                    </span>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-2">
                  {renderStars(course.rating || 0)}
                  <span className="text-[10px] text-text-muted ml-1">
                    {course.rating ? course.rating.toFixed(1) : 'N/A'} ({course.enrollmentCount || 0} enrolled)
                  </span>
                </div>

                {/* Skills */}
                {course.skills && course.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {course.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-background text-text-muted border border-border">
                        {skill}
                      </span>
                    ))}
                    {course.skills.length > 3 && (
                      <span className="text-[10px] text-text-muted">+{course.skills.length - 3} more</span>
                    )}
                  </div>
                )}

                {/* Expandable detail */}
                {expandedCourseId === course.id && (
                  <div className="mb-3 pt-2 border-t border-border">
                    {course.description && (
                      <p className="text-xs text-text-muted mb-2">{course.description}</p>
                    )}
                    {course.whatYouLearn && course.whatYouLearn.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-text mb-1">What you&apos;ll learn:</p>
                        <ul className="list-disc list-inside text-xs text-text-muted space-y-0.5">
                          {course.whatYouLearn.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {course.externalUrl && (
                      <a
                        href={course.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View on {course.provider?.replace(/_/g, ' ') || 'External Site'}
                      </a>
                    )}
                  </div>
                )}

                <div className="mt-auto flex items-center gap-2">
                  {course.isEnrolled ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Enrolled
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEnroll(course.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                    >
                      Enroll Now
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleExpand(course.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text hover:bg-background transition-colors"
                  >
                    {expandedCourseId === course.id ? (
                      <>Less <ChevronUp className="h-3 w-3" /></>
                    ) : (
                      <>Details <ChevronDown className="h-3 w-3" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
