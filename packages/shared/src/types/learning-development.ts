// Learning & Development module types

export interface CourseData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  format: string;
  provider: string | null;
  externalUrl: string | null;
  duration: number | null;
  difficulty: string;
  skills: string[];
  topics: string[];
  thumbnailUrl: string | null;
  scormEnabled: boolean;
  xapiEnabled: boolean;
  isMandatory: boolean;
  complianceCategory: string | null;
  avgRating: number;
  totalEnrollments: number;
  createdAt: string;
}

export interface CourseEnrollmentData {
  id: string;
  courseId: string;
  courseTitle?: string;
  employeeId: string;
  employeeName?: string;
  assignedBy: string | null;
  assignmentType: string;
  status: string;
  progress: number;
  score: number | null;
  completedAt: string | null;
  deadline: string | null;
  certificateUrl: string | null;
  timeSpent: number;
  lastAccessedAt: string | null;
  rating: number | null;
  review: string | null;
  createdAt: string;
}

export interface LearningPathData {
  id: string;
  employeeId: string | null;
  employeeName?: string;
  title: string;
  description: string | null;
  type: string;
  targetRole: string | null;
  skills: string[];
  totalItems: number;
  completedItems: number;
  progress: number;
  estimatedHours: number | null;
  status: string;
  completedAt: string | null;
  certificateUrl: string | null;
  items?: LearningPathItemData[];
  createdAt: string;
}

export interface LearningPathItemData {
  id: string;
  learningPathId: string;
  courseId: string | null;
  courseTitle?: string;
  itemType: string;
  title: string;
  order: number;
  isRequired: boolean;
  status: string;
  completedAt: string | null;
}

export interface CertificationData {
  id: string;
  employeeId: string;
  employeeName?: string;
  name: string;
  issuingBody: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  renewalDate: string | null;
  cpeCredits: number;
  cpeEarned: number;
  status: string;
  proofUrl: string | null;
  proofFileName: string | null;
  createdAt: string;
}

export interface TrainingSessionData {
  id: string;
  courseId: string | null;
  courseTitle?: string;
  title: string;
  description: string | null;
  type: string;
  instructorId: string | null;
  instructorName: string | null;
  location: string | null;
  roomName: string | null;
  virtualLink: string | null;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  enrolledCount: number;
  waitlistCount: number;
  autoEnrollWaitlist: boolean;
  status: string;
  createdAt: string;
}

export interface LearningBudgetData {
  id: string;
  type: string;
  departmentId: string | null;
  departmentName?: string;
  employeeId: string | null;
  employeeName?: string;
  fiscalYear: string;
  totalBudget: string;
  allocatedAmount: string;
  spentAmount: string;
  remainingAmount: string;
  currency: string;
  rolloverEnabled: boolean;
  rolloverAmount: string;
  spendHistory: any[];
  status: string;
  notes: string | null;
  createdAt: string;
}
