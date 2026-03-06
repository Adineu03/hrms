// Expense Management module types

export interface ExpenseCategoryData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface ExpensePolicyData {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName?: string;
  maxAmountPerClaim: number | null;
  maxAmountPerMonth: number | null;
  requiresReceipt: boolean;
  receiptMinAmount: number;
  perDiemRate: number | null;
  appliesToRole: string | null;
  appliesToGrade: string | null;
  appliesToDepartment: string | null;
  appliesToDepartmentName?: string;
  approvalLevels: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ExpenseReportData {
  id: string;
  employeeId: string;
  employeeName?: string;
  title: string;
  description: string | null;
  totalAmount: number;
  itemCount?: number;
  status: string; // 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'reimbursed'
  submittedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  reimbursedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface ExpenseItemData {
  id: string;
  reportId: string;
  categoryId: string | null;
  categoryName?: string;
  date: string;
  amount: number;
  vendor: string | null;
  description: string;
  receiptUrl: string | null;
  receiptName: string | null;
  createdAt: string;
}

export interface ExpenseApprovalData {
  id: string;
  reportId: string;
  approverId: string;
  approverName?: string;
  action: string; // 'approved' | 'rejected' | 'returned' | 'commented'
  comments: string | null;
  level: number;
  actionAt: string;
  createdAt: string;
}

export interface ExpenseSummaryData {
  totalReports: number;
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  reimbursedAmount: number;
  categoryBreakdown: { category: string; amount: number; count: number }[];
  departmentBreakdown: { department: string; amount: number; count: number }[];
  monthlyTrend: { month: string; amount: number; count: number }[];
}

export interface TeamExpenseSummaryData {
  teamHeadcount: number;
  totalExpenses: number;
  pendingApprovals: number;
  pendingAmount: number;
  approvedAmount: number;
  budgetVsActual: { budget: number; actual: number; variance: number };
  topSpenders: { employeeName: string; amount: number; count: number }[];
  categoryBreakdown: { category: string; amount: number; count: number }[];
}

export interface EmployeeExpensePolicyView {
  categoryName: string;
  maxPerClaim: number | null;
  maxPerMonth: number | null;
  requiresReceipt: boolean;
  receiptMinAmount: number;
  perDiemRate: number | null;
}
