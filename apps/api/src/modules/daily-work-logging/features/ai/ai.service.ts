import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class DailyWorkLoggingAiService {
  constructor(private readonly aiService: AiService) {}

  // ── Employee ──────────────────────────────────────────────────────────────

  async autoFillTimesheet(orgId: string, employeeId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId }),
      'Reconstruct the employee\'s day from calendar events, Jira activity, Slack patterns, and app usage. Generate a complete draft timesheet. Return JSON with: { draftEntries: Array<{ time: string, duration: number, project: string, task: string, description: string, billable: boolean, source: string, confidence: number }>, totalHours: number, patterns: string[], insights: string[] }',
    );
    return { data: result };
  }

  async smartCategorization(orgId: string, employeeId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId }),
      'Auto-categorize time entries: billable/non-billable, map Jira tickets to projects, detect admin/training/client time. Return JSON with: { categorizations: Array<{ entryId: string, suggestedCategory: string, billable: boolean, project: string, confidence: number, reason: string }>, summaryByCategory: Record<string, number>, insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  async gapDetector(orgId: string, employeeId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId }),
      'Detect unlogged hours between known activities. Prompt for the missing time. Check if total logged hours are below expected. Return JSON with: { gaps: Array<{ startTime: string, endTime: string, duration: number, context: string, prompt: string }>, totalLoggedHours: number, expectedHours: number, shortfall: number, suggestions: string[] }',
    );
    return { data: result };
  }

  async productivityInsights(orgId: string, employeeId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId }),
      'Generate a weekly personal productivity summary: meeting time %, deep work %, admin %, context switches, most productive day/time, week-over-week trends. Return JSON with: { weekSummary: string, meetingPercent: number, deepWorkPercent: number, adminPercent: number, contextSwitches: number, mostProductiveDay: string, mostProductiveTime: string, weekOverWeekComparison: string, insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  // ── Manager ───────────────────────────────────────────────────────────────

  async utilizationOptimizer(orgId: string, managerId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId }),
      'Analyze team utilization and recommend workload rebalancing. Identify burnout risks and under-utilization. Return JSON with: { teamUtilization: Array<{ employeeId: string, name: string, utilizationRate: number, status: string, riskLevel: string }>, rebalancingRecommendations: Array<{ from: string, to: string, task: string, reason: string }>, weeklyInsights: string[], insights: string[] }',
    );
    return { data: result };
  }

  async budgetBurnPredictor(orgId: string, managerId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId }),
      'Forecast budget depletion dates for each project. Suggest scope or staffing adjustments to stay within budget. Return JSON with: { projects: Array<{ projectId: string, name: string, budgetUsed: number, budgetTotal: number, burnRate: number, depletionDate: string, daysEarly: number, risk: string }>, adjustmentSuggestions: Array<{ project: string, action: string, impact: string }>, insights: string[] }',
    );
    return { data: result };
  }

  async workPatternAnalysis(orgId: string, managerId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId }),
      'Identify time sinks, inefficiencies, and patterns in team time usage. Compare against high-performing teams. Return JSON with: { patterns: Array<{ category: string, teamPercent: number, benchmarkPercent: number, deviation: string, insight: string }>, timeSinks: string[], inefficiencies: string[], companyAvgComparison: string, recommendations: string[] }',
    );
    return { data: result };
  }

  async entryAnomalyDetection(orgId: string, managerId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId }),
      'Flag unusual time entries: excessive hours on short tasks, weekend logging without OT approval, scope creep signals. Distinguish genuine anomalies from legitimate edge cases. Return JSON with: { anomalies: Array<{ employeeId: string, name: string, entryDate: string, issue: string, severity: string, context: string, isLikelyLegitimate: boolean }>, scopeCreepSignals: string[], recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async utilizationIntelligence(orgId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId }),
      'Analyze org-wide utilization by department, grade, location, project type. Benchmark against industry standards. Return JSON with: { orgUtilization: number, departmentBreakdown: Array<{ department: string, location: string, utilization: number, benchmark: number, insight: string }>, topInsight: string, industryBenchmark: number, recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  async revenueLeakageDetector(orgId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId }),
      'Identify billable work logged as non-billable. Quantify financial impact of categorization errors. Return JSON with: { unbilledHours: number, estimatedLeakage: number, currency: string, leakageEntries: Array<{ employeeId: string, project: string, hours: number, value: number, reason: string }>, topLeakageSources: string[], recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  async complianceAutoCheck(orgId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId }),
      'Validate all timesheets against labor laws across 50+ jurisdictions before payroll. Flag violations: max hours, missing breaks, under-age restrictions. Return JSON with: { complianceScore: number, violations: Array<{ employeeId: string, jurisdiction: string, violation: string, severity: string, date: string }>, prePayrollClearance: boolean, jurisdictionSummary: Record<string, { violations: number, clear: boolean }>, recommendations: string[] }',
    );
    return { data: result };
  }

  async capacityPlanner(orgId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId }),
      'Model future capacity from project pipeline, attrition forecast, and hiring plan. Identify shortfalls. Return JSON with: { currentCapacity: number, projectedCapacity: Record<string, number>, shortfalls: Array<{ department: string, quarter: string, shortfallPercent: number, headcount: number }>, hiringRecommendations: Array<{ role: string, quantity: number, targetDate: string }>, scenarioAnalysis: string[], insights: string[] }',
    );
    return { data: result };
  }
}
