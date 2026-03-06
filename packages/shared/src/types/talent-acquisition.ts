// Talent Acquisition — Types (Phase 6)

// ─── Status & Enum Types ────────────────────────────────────────────────────

export type RequisitionStatus = 'draft' | 'pending_approval' | 'approved' | 'open' | 'on_hold' | 'filled' | 'cancelled';
export type RequisitionPriority = 'low' | 'medium' | 'high' | 'urgent';
export type JobPostingStatus = 'draft' | 'published' | 'paused' | 'closed' | 'archived';
export type PostingType = 'internal' | 'external' | 'both';
export type CandidateStatus = 'active' | 'blacklisted' | 'archived';
export type ApplicationStatus = 'new' | 'screening' | 'in_progress' | 'shortlisted' | 'offered' | 'hired' | 'rejected' | 'withdrawn';
export type InterviewStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
export type InterviewDecision = 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire' | 'next_round';
export type InterviewType = 'in_person' | 'video' | 'phone' | 'assessment';
export type OfferStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'negotiating' | 'expired' | 'withdrawn';
export type ReferralStatus = 'submitted' | 'screening' | 'shortlisted' | 'interviewing' | 'hired' | 'rejected' | 'duplicate';
export type ReferralBonusStatus = 'not_eligible' | 'eligible' | 'processing' | 'paid';
export type StageType = 'screening' | 'phone_screen' | 'technical' | 'hr' | 'panel' | 'assessment' | 'offer' | 'custom';
export type TalentEmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type CandidateSource = 'direct' | 'referral' | 'linkedin' | 'indeed' | 'naukri' | 'agency' | 'careers_page';

// ─── Supporting Types ───────────────────────────────────────────────────────

export interface ExperienceRequirement {
  minYears?: number;
  maxYears?: number;
  preferred?: string;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  year?: number;
  field?: string;
}

export interface LocationDetails {
  city?: string;
  state?: string;
  country?: string;
  remoteAllowed?: boolean;
  hybridAllowed?: boolean;
}

export interface EvaluationCriterion {
  name: string;
  description?: string;
  maxScore: number;
  weight?: number;
}

export interface PanelMemberInfo {
  userId: string;
  name?: string;
  role?: string;
  status?: 'pending' | 'accepted' | 'declined';
}

export interface InterviewFeedbackItem {
  interviewId: string;
  interviewerName?: string;
  score?: number;
  decision?: InterviewDecision;
  comments?: string;
  submittedAt?: string;
}

export interface TalentApprovalChainItem {
  level: number;
  approverId: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  actionAt?: string;
}

export interface NegotiationEntry {
  round: number;
  proposedSalary: number;
  counterSalary?: number;
  notes?: string;
  date: string;
}

// ─── Job Requisition ────────────────────────────────────────────────────────

export interface JobRequisitionData {
  id?: string;
  orgId?: string;
  title: string;
  departmentId?: string;
  departmentName?: string;
  designationId?: string;
  designationName?: string;
  locationId?: string;
  locationName?: string;
  gradeId?: string;
  gradeName?: string;
  headcount: number;
  employmentType: TalentEmploymentType;
  salaryRangeMin?: number;
  salaryRangeMax?: number;
  currency?: string;
  budgetAmount?: number;
  description?: string;
  requirements?: string;
  skills?: string[];
  experience?: ExperienceRequirement;
  approvalChain?: TalentApprovalChainItem[];
  currentApproverLevel?: number;
  approvedBy?: string;
  approvedAt?: string;
  status: RequisitionStatus;
  priority?: RequisitionPriority;
  targetHireDate?: string;
  filledCount?: number;
  createdBy?: string;
  createdByName?: string;
  metadata?: Record<string, any>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Job Posting ────────────────────────────────────────────────────────────

export interface JobPostingData {
  id?: string;
  orgId?: string;
  requisitionId: string;
  requisitionTitle?: string;
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  skills?: string[];
  experience?: ExperienceRequirement;
  qualifications?: string[];
  postingType: PostingType;
  channels?: string[];
  locationDetails?: LocationDetails;
  salaryVisible?: boolean;
  salaryDisplay?: string;
  applicationDeadline?: string;
  status: JobPostingStatus;
  publishedAt?: string;
  closedAt?: string;
  viewCount?: number;
  applicationCount?: number;
  createdBy?: string;
  metadata?: Record<string, any>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Candidate ──────────────────────────────────────────────────────────────

export interface CandidateData {
  id?: string;
  orgId?: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  currentTitle?: string;
  currentCompany?: string;
  experienceYears?: number;
  skills?: string[];
  education?: EducationEntry[];
  resumeUrl?: string;
  resumeText?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  source?: CandidateSource;
  salaryExpectation?: number;
  currency?: string;
  noticePeriodDays?: number;
  currentLocation?: string;
  preferredLocations?: string[];
  tags?: string[];
  notes?: string;
  status?: CandidateStatus;
  metadata?: Record<string, any>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Application ────────────────────────────────────────────────────────────

export interface ApplicationData {
  id?: string;
  orgId?: string;
  candidateId: string;
  candidateName?: string;
  candidateEmail?: string;
  jobPostingId: string;
  jobPostingTitle?: string;
  requisitionId: string;
  source?: CandidateSource;
  referralId?: string;
  coverLetter?: string;
  resumeUrl?: string;
  currentStageId?: string;
  currentStageName?: string;
  status: ApplicationStatus;
  overallScore?: number;
  feedback?: InterviewFeedbackItem[];
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  withdrawnAt?: string;
  withdrawReason?: string;
  hiredAt?: string;
  appliedAt?: string;
  internalEmployeeId?: string;
  metadata?: Record<string, any>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Recruitment Pipeline Stage ─────────────────────────────────────────────

export interface RecruitmentPipelineStageData {
  id?: string;
  orgId?: string;
  requisitionId?: string;
  name: string;
  code?: string;
  stageType: StageType;
  sortOrder: number;
  evaluationCriteria?: EvaluationCriterion[];
  scorecardTemplate?: Record<string, any>;
  autoAdvanceEnabled?: boolean;
  autoAdvanceThreshold?: number;
  autoRejectEnabled?: boolean;
  autoRejectThreshold?: number;
  rejectionTemplate?: string;
  slaDays?: number;
  interviewerCount?: number;
  isMandatory?: boolean;
  metadata?: Record<string, any>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Interview ──────────────────────────────────────────────────────────────

export interface InterviewData {
  id?: string;
  orgId?: string;
  applicationId: string;
  stageId: string;
  stageName?: string;
  candidateId: string;
  candidateName?: string;
  scheduledAt?: string;
  duration?: number;
  location?: string;
  interviewType: InterviewType;
  panelMembers?: PanelMemberInfo[];
  status: InterviewStatus;
  feedback?: Record<string, any>;
  overallScore?: number;
  decision?: InterviewDecision;
  decisionBy?: string;
  decisionAt?: string;
  notes?: string;
  rescheduleCount?: number;
  cancelReason?: string;
  calendarEventId?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Offer Letter ───────────────────────────────────────────────────────────

export interface OfferLetterData {
  id?: string;
  orgId?: string;
  applicationId: string;
  candidateId: string;
  candidateName?: string;
  requisitionId: string;
  designation: string;
  department?: string;
  location?: string;
  employmentType?: TalentEmploymentType;
  salaryAmount: number;
  currency?: string;
  salaryBreakdown?: Record<string, any>;
  joiningDate?: string;
  probationMonths?: number;
  reportingTo?: string;
  terms?: string;
  benefits?: string[];
  templateId?: string;
  approvalChain?: TalentApprovalChainItem[];
  currentApproverLevel?: number;
  approvedBy?: string;
  approvedAt?: string;
  status: OfferStatus;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  negotiationHistory?: NegotiationEntry[];
  validUntil?: string;
  documentUrl?: string;
  createdBy?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Referral ───────────────────────────────────────────────────────────────

export interface ReferralData {
  id?: string;
  orgId?: string;
  referrerId: string;
  referrerName?: string;
  jobPostingId: string;
  jobPostingTitle?: string;
  candidateId?: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateResume?: string;
  relationship?: string;
  notes?: string;
  status: ReferralStatus;
  bonusAmount?: number;
  bonusCurrency?: string;
  bonusStatus?: ReferralBonusStatus;
  bonusPaidAt?: string;
  applicationId?: string;
  metadata?: Record<string, any>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Dashboard & Report Types ───────────────────────────────────────────────

export interface RequisitionSummary {
  totalRequisitions: number;
  byStatus: Record<string, number>;
  openPositions: number;
  filledPositions: number;
  averageTimeToFill?: number;
}

export interface PipelineFunnelData {
  stageName: string;
  stageType: StageType;
  count: number;
  dropOffRate?: number;
}

export interface SourceEffectivenessData {
  source: CandidateSource;
  applicants: number;
  shortlisted: number;
  hired: number;
  conversionRate: number;
  averageCostPerHire?: number;
}

export interface HiringMetrics {
  timeToHire: number;
  costPerHire: number;
  offerAcceptanceRate: number;
  interviewToHireRatio: number;
}

export interface RecruiterProductivityData {
  recruiterId: string;
  recruiterName: string;
  interviewsScheduled: number;
  offersMade: number;
  hires: number;
  averageTimeToFill: number;
}

export interface TeamHiringReport {
  openPositions: number;
  filledPositions: number;
  averageTimeToFill: number;
  interviewToHireRatio: number;
  upcomingJoiners: UpcomingJoinerEntry[];
}

export interface UpcomingJoinerEntry {
  candidateName: string;
  designation: string;
  joiningDate: string;
  department?: string;
}

export interface ReferralLeaderboardEntry {
  referrerId: string;
  referrerName: string;
  totalReferrals: number;
  hiredReferrals: number;
  pendingReferrals: number;
  totalBonusEarned: number;
}

export interface OfferAnalytics {
  totalOffers: number;
  acceptanceRate: number;
  negotiationRate: number;
  averageTimeToAccept: number;
  byStatus: Record<string, number>;
}

export interface InternalJobBoardFilters {
  departmentId?: string;
  locationId?: string;
  gradeId?: string;
  employmentType?: TalentEmploymentType;
  search?: string;
}

export interface BookmarkedJob {
  jobPostingId: string;
  title: string;
  department?: string;
  location?: string;
  bookmarkedAt: string;
}

export interface CareerProfileData {
  skills?: string[];
  experience?: string;
  certifications?: string[];
  jobPreferences?: JobPreferences;
  visibility?: 'active' | 'passive' | 'not_looking';
  resumeVersions?: ResumeVersion[];
  educationDetails?: EducationEntry[];
  portfolioLinks?: string[];
  professionalSummary?: string;
}

export interface JobPreferences {
  roles?: string[];
  salaryExpectation?: number;
  currency?: string;
  locations?: string[];
  remotePreference?: 'on_site' | 'remote' | 'hybrid' | 'any';
}

export interface ResumeVersion {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  isDefault: boolean;
}
