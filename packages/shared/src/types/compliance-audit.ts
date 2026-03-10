// Compliance & Audit module types

export interface CompliancePolicyData {
  id: string;
  title: string;
  policyCode: string;
  category: string; // 'hr' | 'it' | 'safety' | 'ethics' | 'data-privacy' | 'other'
  description: string | null;
  content: string | null;
  version: string;
  previousVersionId: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  status: string; // 'draft' | 'pending_approval' | 'published' | 'archived'
  approvedBy: string | null;
  approvedAt: string | null;
  mandatoryAcknowledgment: boolean;
  reminderCadenceDays: number | null;
  appliesToEntity: string | null;
  appliesToLocation: string | null;
  appliesToDepartment: string | null;
  appliesToGrade: string | null;
  jurisdiction: string | null;
  language: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyAcknowledgmentData {
  id: string;
  policyId: string;
  policyTitle?: string;
  policyVersion: string;
  employeeId: string;
  employeeName?: string;
  acknowledgedAt: string;
  ipAddress: string | null;
  createdAt: string;
}

export interface ComplianceTrainingData {
  id: string;
  title: string;
  category: string; // 'harassment' | 'data-privacy' | 'safety' | 'anti-bribery' | 'other'
  description: string | null;
  durationMinutes: number | null;
  passingScore: number | null;
  validityMonths: number | null;
  isMandatory: boolean;
  appliesToRole: string | null;
  appliesToDepartment: string | null;
  deadlineDays: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface TrainingCompletionData {
  id: string;
  trainingId: string;
  trainingTitle?: string;
  employeeId: string;
  employeeName?: string;
  assignedAt: string;
  dueDate: string | null;
  completedAt: string | null;
  score: number | null;
  passed: boolean | null;
  certificateUrl: string | null;
  renewalDue: string | null;
  status: string; // 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'expired'
  createdAt: string;
}

export interface EthicsComplaintData {
  id: string;
  referenceCode: string;
  category: string;
  description: string;
  incidentDate: string | null;
  location: string | null;
  status: string; // 'received' | 'in_progress' | 'findings' | 'resolution' | 'closed'
  investigatorId: string | null;
  investigationNotes: string | null;
  outcome: string | null;
  closedAt: string | null;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditTrailConfigData {
  id: string;
  entity: string;
  retentionDays: number;
  isTracked: boolean;
  trackCreate: boolean;
  trackUpdate: boolean;
  trackDelete: boolean;
  trackView: boolean;
  trackExport: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ComplianceChecklistData {
  id: string;
  title: string;
  jurisdiction: string;
  category: string;
  description: string | null;
  dueDate: string | null;
  frequency: string | null;
  status: string; // 'pending' | 'in_progress' | 'completed' | 'overdue'
  assignedTo: string | null;
  completedAt: string | null;
  evidenceNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceDashboardSummary {
  totalPolicies: number;
  publishedPolicies: number;
  pendingAcknowledgments: number;
  trainingCompletionRate: number;
  overdueMandatoryTrainings: number;
  openEthicsComplaints: number;
  overdueChecklists: number;
  upcomingDeadlines: number;
}

export interface TeamComplianceOverview {
  teamHeadcount: number;
  compliantMembers: number;
  complianceRate: number;
  overdueTrainings: number;
  pendingPolicyAcks: number;
  openViolations: number;
}

export interface ComplianceAuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: unknown | null;
  newValue: unknown | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: string;
}
