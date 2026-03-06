// Compensation & Rewards module types

export interface CompensationRevisionData {
  id: string;
  title: string;
  type: string;
  fiscalYear: string;
  status: string;
  effectiveDate: string | null;
  totalBudget: string;
  allocatedBudget: string;
  spentBudget: string;
  meritMatrix: any;
  approvalWorkflow: any;
  departments: string[];
  grades: string[];
  createdBy: string | null;
  createdAt: string;
}

export interface CompensationRevisionItemData {
  id: string;
  revisionId: string;
  employeeId: string;
  employeeName?: string;
  currentCtc: string;
  proposedCtc: string;
  incrementPercent: string;
  incrementAmount: string;
  meritScore: number | null;
  status: string;
  proposedBy: string | null;
  approvedBy: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface RecognitionProgramData {
  id: string;
  name: string;
  type: string;
  description: string | null;
  frequency: string;
  pointsValue: number;
  budget: string;
  spentBudget: string;
  nominationWorkflow: any;
  eligibilityRules: any;
  rewardCatalog: any[];
  isActive: boolean;
  createdAt: string;
}

export interface RecognitionNominationData {
  id: string;
  programId: string;
  programName?: string;
  nomineeId: string;
  nomineeName?: string;
  nominatorId: string;
  nominatorName?: string;
  category: string;
  reason: string;
  status: string;
  approvedBy: string | null;
  pointsAwarded: number;
  awardDate: string | null;
  createdAt: string;
}

export interface RecognitionPointData {
  id: string;
  employeeId: string;
  employeeName?: string;
  totalEarned: number;
  totalRedeemed: number;
  balance: number;
  transactions: RecognitionPointTransactionData[];
}

export interface RecognitionPointTransactionData {
  id: string;
  type: string;
  points: number;
  reason: string;
  nominationId: string | null;
  redeemedItem: string | null;
  createdAt: string;
}

export interface PaySlipData {
  id: string;
  employeeId: string;
  employeeName?: string;
  month: number;
  year: number;
  basicSalary: string;
  hra: string;
  da: string;
  specialAllowance: string;
  otherEarnings: string;
  grossEarnings: string;
  pfDeduction: string;
  esiDeduction: string;
  ptDeduction: string;
  incomeTax: string;
  otherDeductions: string;
  totalDeductions: string;
  netPay: string;
  status: string;
  generatedAt: string | null;
  downloadUrl: string | null;
  createdAt: string;
}

export interface InvestmentDeclarationData {
  id: string;
  employeeId: string;
  employeeName?: string;
  fiscalYear: string;
  taxRegime: string;
  section80c: any;
  section80d: any;
  hraExemption: any;
  otherDeductions: any;
  totalDeclared: string;
  totalVerified: string;
  status: string;
  submittedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
}

export interface ReimbursementClaimData {
  id: string;
  employeeId: string;
  employeeName?: string;
  type: string;
  amount: string;
  description: string;
  receiptUrl: string | null;
  status: string;
  submittedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface TeamCompensationMemberData {
  id: string;
  name: string;
  designation: string;
  grade: string | null;
  currentCtc: string;
  band: string | null;
  lastIncrementDate: string | null;
  lastIncrementPercent: string | null;
  tenure: number;
}

export interface CompensationAnalyticsData {
  payEquity: {
    byGender: any[];
    byGrade: any[];
    byDepartment: any[];
  };
  budgetVsActual: {
    totalBudget: string;
    totalSpent: string;
    utilizationPercent: number;
    byDepartment: any[];
  };
  benchmarking: {
    orgMedianCtc: string;
    industryMedianCtc: string;
    percentile: number;
  };
}
