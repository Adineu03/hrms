// Workforce Planning module types

export interface WorkforceHeadcountPlanData {
  id: string;
  planName: string;
  planYear: number;
  departmentId: string | null;
  locationId: string | null;
  gradeId: string | null;
  entityId: string | null;
  currentHeadcount: number;
  approvedHeadcount: number;
  targetHeadcount: number;
  openRequisitions: number;
  hiringFreezeActive: boolean;
  hiringFreezeReason: string | null;
  status: string; // 'draft' | 'pending_approval' | 'approved' | 'active'
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkforceBudgetData {
  id: string;
  budgetName: string;
  budgetYear: number;
  departmentId: string | null;
  costCenter: string | null;
  allocatedAmount: string;
  actualSpend: string;
  projectedSpend: string;
  salaryIncreasePool: string | null;
  benefitsCostProjected: string | null;
  fteCount: number | null;
  currency: string;
  status: string; // 'draft' | 'pending_approval' | 'approved' | 'active'
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SuccessionPlanData {
  id: string;
  positionTitle: string;
  departmentId: string | null;
  currentHolderId: string | null;
  isKeyPosition: boolean;
  criticalityLevel: string; // 'critical' | 'high' | 'medium'
  benchStrength: string | null; // 'strong' | 'adequate' | 'weak' | 'none'
  successionCoveragePercent: number | null;
  notes: string | null;
  lastReviewedAt: string | null;
  reviewedBy: string | null;
  status: string; // 'active' | 'archived'
  candidates?: SuccessionCandidateData[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SuccessionCandidateData {
  id: string;
  successionPlanId: string;
  candidateEmployeeId: string;
  candidateName?: string;
  readinessLevel: string; // 'ready_now' | '1yr' | '2yr'
  performanceRating: string | null;
  potentialRating: string | null;
  flightRisk: string | null; // 'high' | 'medium' | 'low'
  developmentNotes: string | null;
  nominatedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  status: string; // 'nominated' | 'approved' | 'removed'
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InternalTransferRequestData {
  id: string;
  employeeId: string;
  employeeName?: string;
  requestType: string; // 'transfer' | 'lateral_move' | 'promotion' | 'location_change'
  fromDepartmentId: string | null;
  toDepartmentId: string | null;
  fromLocationId: string | null;
  toLocationId: string | null;
  fromEntityId: string | null;
  toEntityId: string | null;
  fromDesignationId: string | null;
  toDesignationId: string | null;
  effectiveDate: string | null;
  reason: string | null;
  managerInitiated: boolean;
  initiatedBy: string | null;
  currentApproverId: string | null;
  backfillRequired: boolean;
  backfillStatus: string | null;
  status: string; // 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  completedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleGradeDefinitionData {
  id: string;
  roleTitle: string;
  jobFamily: string;
  jobFunction: string | null;
  gradeCode: string;
  gradeLevel: number;
  salaryRangeMin: string | null;
  salaryRangeMax: string | null;
  salaryRangeMid: string | null;
  currency: string;
  roleDescription: string | null;
  keyResponsibilities: string[] | null;
  competencyRequirements: string[] | null;
  typicalExperienceYears: string | null;
  isManagerialRole: boolean;
  reportingToGradeCode: string | null;
  equivalentRoles: string[] | null;
  progressionPaths: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkforceAnalyticsSummary {
  totalHeadcount: number;
  attritionRate: number;
  voluntaryAttrition: number;
  involuntaryAttrition: number;
  regrettableAttrition: number;
  internalMobilityRate: number;
  promotionRate: number;
  averageTenureMonths: number;
  genderRatioMale: number;
  genderRatioFemale: number;
  openPositions: number;
  successionCoverage: number;
}

export interface TeamHeadcountSummary {
  totalApproved: number;
  totalActual: number;
  openPositions: number;
  plannedJoiners: number;
  plannedLeavers: number;
}

export interface TeamSuccessionSummary {
  keyRoles: number;
  rolesWithSuccessors: number;
  benchStrengthScore: number;
  readyNowCount: number;
  within1YrCount: number;
  within2YrCount: number;
}
