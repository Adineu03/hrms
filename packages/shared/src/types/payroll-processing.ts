// Payroll Processing module types

export interface PayrollRunData {
  id: string;
  month: number;
  year: number;
  status: string; // 'draft' | 'processing' | 'review' | 'approved' | 'finalized' | 'paid'
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  processedBy: string | null;
  processedByName?: string;
  approvedBy: string | null;
  approvedByName?: string;
  processedAt: string | null;
  approvedAt: string | null;
  finalizedAt: string | null;
  isLocked: boolean;
  createdAt: string;
}

export interface PayrollEntryData {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName?: string;
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  otherEarnings: number;
  grossEarnings: number;
  pfDeduction: number;
  esiDeduction: number;
  ptDeduction: number;
  incomeTax: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  overtimeAmount: number;
  bonusAmount: number;
  arrearsAmount: number;
  reimbursementAmount: number;
  lossOfPayDays: number;
  status: string;
  createdAt: string;
}

export interface SalaryComponentData {
  id: string;
  name: string;
  type: string; // 'earning' | 'deduction'
  category: string; // 'basic' | 'hra' | 'da' | 'special_allowance' | 'statutory' | 'tax' | 'other'
  calculationType: string; // 'fixed' | 'percentage' | 'formula'
  calculationValue: number | null;
  percentageOf: string | null;
  isStatutory: boolean;
  isTaxable: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface PayrollConfigData {
  id: string;
  payrollCycleDay: number; // day of month payroll runs
  paymentDay: number; // day of month payment is made
  taxRegime: string; // 'old' | 'new'
  pfEnabled: boolean;
  pfEmployerRate: number;
  pfEmployeeRate: number;
  esiEnabled: boolean;
  esiEmployerRate: number;
  esiEmployeeRate: number;
  ptEnabled: boolean;
  lwfEnabled: boolean;
  autoProcessEnabled: boolean;
  approvalRequired: boolean;
  createdAt: string;
}

export interface StatutoryFilingData {
  id: string;
  type: string; // 'pf' | 'esi' | 'pt' | 'lwf' | 'tds' | 'form16' | 'form24q'
  period: string; // 'YYYY-MM' or 'YYYY'
  dueDate: string;
  status: string; // 'pending' | 'filed' | 'overdue' | 'completed'
  amount: number;
  challanNumber: string | null;
  filedAt: string | null;
  filedBy: string | null;
  filedByName?: string;
  remarks: string | null;
  createdAt: string;
}

export interface TaxProofData {
  id: string;
  employeeId: string;
  employeeName?: string;
  declarationId: string;
  section: string; // '80C' | '80D' | 'HRA' | '80E' | '80G' | 'NPS'
  description: string;
  declaredAmount: number;
  proofAmount: number;
  documentUrl: string | null;
  status: string; // 'pending' | 'verified' | 'rejected'
  verifiedBy: string | null;
  verifiedAt: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface PayrollSummaryData {
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalPfContribution: number;
  totalEsiContribution: number;
  totalTaxDeducted: number;
  departmentBreakdown: { department: string; headcount: number; totalCost: number }[];
  monthOverMonth: { month: string; grossPay: number; netPay: number; headcount: number }[];
}

export interface TeamPayrollSummaryData {
  teamHeadcount: number;
  totalTeamCost: number;
  overtimeCost: number;
  pendingApprovals: number;
  costByMonth: { month: string; cost: number }[];
  budgetVsActual: { budget: number; actual: number; variance: number };
}

export interface PayslipViewData {
  id: string;
  month: number;
  year: number;
  employeeName: string;
  designation: string;
  department: string;
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  otherEarnings: number;
  grossEarnings: number;
  pfDeduction: number;
  esiDeduction: number;
  ptDeduction: number;
  incomeTax: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  downloadUrl: string | null;
}

export interface TaxComputationData {
  fiscalYear: string;
  taxRegime: string;
  grossIncome: number;
  exemptions: { section: string; amount: number }[];
  totalExemptions: number;
  taxableIncome: number;
  taxSlabs: { range: string; rate: number; tax: number }[];
  totalTax: number;
  cessTax: number;
  totalTaxPayable: number;
  tdsDeducted: number;
  remainingTax: number;
}

export interface SalaryRevisionHistoryData {
  id: string;
  effectiveFrom: string;
  ctc: number;
  basicSalary: number;
  reason: string | null;
  revisedBy: string | null;
  revisedByName?: string;
  createdAt: string;
}
