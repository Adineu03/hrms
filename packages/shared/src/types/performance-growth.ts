// Performance & Growth module types

export interface ReviewCycleData {
  id: string;
  name: string;
  description: string | null;
  type: string;
  reviewTypes: string[];
  ratingScaleType: string;
  ratingScaleConfig: Record<string, any>;
  componentWeightage: Record<string, any>;
  startDate: string | null;
  endDate: string | null;
  status: string;
  autoNotifications: boolean;
  createdAt: string;
}

export interface ReviewAssignmentData {
  id: string;
  cycleId: string;
  employeeId: string;
  employeeName?: string;
  reviewerId: string | null;
  reviewerType: string;
  status: string;
  selfRating: string | null;
  managerRating: string | null;
  finalRating: string | null;
  selfComments: string | null;
  managerComments: string | null;
  achievements: any[];
  improvementAreas: any[];
  competencyRatings: Record<string, any>;
  calibratedRating: string | null;
  acknowledgedAt: string | null;
  appealReason: string | null;
  appealStatus: string | null;
}

export interface GoalData {
  id: string;
  employeeId: string | null;
  title: string;
  description: string | null;
  category: string;
  framework: string;
  parentGoalId: string | null;
  alignedOrgGoalId: string | null;
  measurementCriteria: string | null;
  successMetrics: any[];
  targetValue: string | null;
  currentValue: string | null;
  unit: string | null;
  weightage: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  status: string;
  progress: string;
  isTemplate: boolean;
  createdAt: string;
}

export interface GoalUpdateData {
  id: string;
  goalId: string;
  previousProgress: string | null;
  newProgress: string | null;
  comment: string | null;
  evidence: any[];
  milestoneTitle: string | null;
  milestoneCompleted: boolean;
  createdAt: string;
}

export interface CompetencyFrameworkData {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  proficiencyLevels: any[];
  departmentIds: string[];
  gradeIds: string[];
  roleMapping: Record<string, any>;
  isDefault: boolean;
  status: string;
  createdAt: string;
}

export interface FeedbackRecordData {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromName?: string;
  toName?: string;
  type: string;
  category: string | null;
  content: string;
  isAnonymous: boolean;
  visibility: string;
  responseContent: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface OneOnOneMeetingData {
  id: string;
  managerId: string;
  employeeId: string;
  employeeName?: string;
  scheduledAt: string;
  duration: number;
  isRecurring: boolean;
  recurrencePattern: string | null;
  agenda: any[];
  notes: string | null;
  actionItems: any[];
  status: string;
  completedAt: string | null;
}

export interface DevelopmentPlanData {
  id: string;
  employeeId: string;
  employeeName?: string;
  title: string;
  description: string | null;
  type: string;
  activities: any[];
  skills: any[];
  certifications: any[];
  careerAspiration: string | null;
  targetRole: string | null;
  gapAnalysis: Record<string, any>;
  mentorId: string | null;
  status: string;
  progress: string;
  startDate: string | null;
  targetDate: string | null;
  pipMilestones: any[];
  pipOutcome: string | null;
}
