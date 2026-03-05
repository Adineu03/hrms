'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2,
  Heart,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Shield,
  Tag,
} from 'lucide-react';

const TYPE_STYLES: Record<string, string> = {
  health: 'bg-red-50 text-red-700',
  dental: 'bg-blue-50 text-blue-700',
  vision: 'bg-purple-50 text-purple-700',
  life: 'bg-green-50 text-green-700',
  retirement: 'bg-orange-50 text-orange-700',
  wellness: 'bg-teal-50 text-teal-700',
  other: 'bg-background text-text-muted',
};

interface BenefitPlan {
  id: string;
  name: string;
  type: string;
  description: string;
  employerContribution: number;
  employeeContribution: number;
}

interface Enrollment {
  id: string;
  planId: string;
  planName: string;
  enrolledAt: string;
  status: string;
}

export default function BenefitsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [plans, setPlans] = useState<BenefitPlan[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollingPlanId, setEnrollingPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [plansRes, enrollmentsRes] = await Promise.all([
        api.get('/core-hr/employee/benefits/plans'),
        api.get('/core-hr/employee/benefits/my-enrollments'),
      ]);
      setPlans(plansRes.data);
      setEnrollments(enrollmentsRes.data);
    } catch {
      setError('Failed to load benefits information.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async (planId: string) => {
    setEnrollingPlanId(planId);
    setError(null);
    try {
      await api.post('/core-hr/employee/benefits/enroll', { planId });
      setSuccessMessage('Successfully enrolled in benefit plan.');
      // Refresh enrollments
      const enrollmentsRes = await api.get('/core-hr/employee/benefits/my-enrollments');
      setEnrollments(enrollmentsRes.data);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('Failed to enroll in benefit plan.');
    } finally {
      setEnrollingPlanId(null);
    }
  };

  const isEnrolled = (planId: string) => {
    return enrollments.some((e) => e.planId === planId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted">Loading benefits...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Available Benefit Plans
        </h3>

        {plans.length === 0 ? (
          <div className="text-center py-12 bg-background rounded-lg border border-border">
            <Shield className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">No benefit plans available at this time.</p>
            <p className="text-xs text-text-muted mt-1">
              Contact your HR administrator for more information.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const enrolled = isEnrolled(plan.id);
              return (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-4 transition-shadow ${
                    enrolled
                      ? 'border-green-300 bg-green-50/30'
                      : 'border-border bg-card hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-text">{plan.name}</h4>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          TYPE_STYLES[plan.type.toLowerCase()] || TYPE_STYLES.other
                        }`}
                      >
                        <Tag className="h-3 w-3" />
                        {plan.type}
                      </span>
                      {enrolled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Enrolled
                        </span>
                      )}
                    </div>
                  </div>

                  {plan.description && (
                    <p className="text-xs text-text-muted mb-3">{plan.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-background rounded-lg p-2">
                      <p className="text-xs text-text-muted flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Employer
                      </p>
                      <p className="text-sm font-semibold text-text">
                        {plan.employerContribution.toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                          minimumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <div className="bg-background rounded-lg p-2">
                      <p className="text-xs text-text-muted flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Employee
                      </p>
                      <p className="text-sm font-semibold text-text">
                        {plan.employeeContribution.toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                          minimumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  </div>

                  {!enrolled && (
                    <button
                      type="button"
                      onClick={() => handleEnroll(plan.id)}
                      disabled={enrollingPlanId === plan.id}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {enrollingPlanId === plan.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        'Enroll'
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Enrollments */}
      {enrollments.length > 0 && (
        <>
          <hr className="border-border" />
          <div>
            <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              My Enrollments ({enrollments.length})
            </h3>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                      Plan
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                      Enrolled On
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {enrollments.map((enrollment) => (
                    <tr
                      key={enrollment.id}
                      className="bg-card hover:bg-background/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-text font-medium">
                        {enrollment.planName}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          {enrollment.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
