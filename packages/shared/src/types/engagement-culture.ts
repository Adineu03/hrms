// Engagement & Culture module types

export interface SurveyData {
  id: string;
  title: string;
  type: string;
  description: string | null;
  status: string;
  questions: any[];
  targetAudience: any;
  scheduledAt: string | null;
  closesAt: string | null;
  isAnonymous: boolean;
  responseCount: number;
  createdBy: string | null;
  createdAt: string;
}

export interface SurveyResponseData {
  id: string;
  surveyId: string;
  surveyTitle?: string;
  respondentId: string | null;
  answers: any[];
  sentiment: string | null;
  submittedAt: string;
  createdAt: string;
}

export interface CultureValueData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  recognitionCount: number;
  createdAt: string;
}

export interface WellnessProgramData {
  id: string;
  name: string;
  type: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  budget: string;
  spentBudget: string;
  maxParticipants: number | null;
  currentParticipants: number;
  resources: any[];
  schedule: any;
  createdAt: string;
}

export interface WellnessParticipationData {
  id: string;
  programId: string;
  programName?: string;
  employeeId: string;
  employeeName?: string;
  status: string;
  progress: number;
  pointsEarned: number;
  enrolledAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface SocialPostData {
  id: string;
  authorId: string;
  authorName?: string;
  type: string;
  content: string;
  mediaUrls: string[];
  groupId: string | null;
  groupName?: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  createdAt: string;
}

export interface SocialGroupData {
  id: string;
  name: string;
  description: string | null;
  type: string;
  coverImageUrl: string | null;
  memberCount: number;
  isJoined?: boolean;
  createdBy: string;
  createdAt: string;
}

export interface EngagementScoreData {
  id: string;
  employeeId: string;
  employeeName?: string;
  overallScore: number;
  enpsScore: number | null;
  cultureFitScore: number | null;
  participationScore: number | null;
  period: string;
  breakdown: any;
  badges: any[];
  createdAt: string;
}

export interface EngagementAnalyticsData {
  enps: {
    current: number;
    previous: number;
    trend: any[];
  };
  engagementScore: {
    overall: number;
    byDepartment: any[];
    trend: any[];
  };
  surveyParticipation: {
    rate: number;
    byDepartment: any[];
  };
  attritionCorrelation: {
    highRiskCount: number;
    riskByDepartment: any[];
  };
  actionItems: any[];
}

export interface TeamEngagementData {
  teamScore: number;
  teamEnps: number;
  participationRate: number;
  recentPulseResults: any[];
  actionItems: any[];
  members: TeamEngagementMemberData[];
}

export interface TeamEngagementMemberData {
  id: string;
  name: string;
  engagementScore: number;
  lastSurveyDate: string | null;
  participationRate: number;
}
