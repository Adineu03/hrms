import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class LeaveAiService {
  constructor(private readonly aiService: AiService) {}

  // ─── Employee Features ────────────────────────────────────────────────────

  async smartLeavePlanner(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, userId, ...context }),
      'You are a smart leave planning assistant. Help the employee plan their leaves optimally throughout the year. Return JSON with: { suggestedLeaveDates: string[], holidays: string[], planningTips: string[], insights: string[] }',
    );
    return { data: { result, confidence: 0.86 } };
  }

  async balanceForecast(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, userId, ...context }),
      'You are a leave balance forecasting AI. Predict how the employee\'s leave balances will evolve over time. Return JSON with: { forecast: string[], projectedBalances: string[], recommendations: string[], alerts: string[], insights: string[] }',
    );
    return { data: { result, confidence: 0.88 } };
  }

  async conversationalApply(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, userId, ...context }),
      'You are a conversational leave application assistant. Help the employee apply for leave with intelligent suggestions. Return JSON with: { suggestedLeaveType: string, bestDates: string[], approvalLikelihood: string, suggestions: string[], tips: string[] }',
    );
    return { data: { result, confidence: 0.84 } };
  }

  async wellnessNudge(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, userId, ...context }),
      'You are a wellness advisor AI. Provide nudges to the employee about taking necessary breaks and maintaining work-life balance. Return JSON with: { wellnessScore: number, nudges: string[], insights: string[], recommendations: string[], burnoutIndicators: string[] }',
    );
    return { data: { result, confidence: 0.82 } };
  }

  // ─── Manager Features ─────────────────────────────────────────────────────

  async coverageRiskAnalyzer(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId: userId, ...context }),
      'You are a team coverage risk analyzer. Assess and predict coverage gaps when employees take leave. Return JSON with: { coverageRisks: string[], criticalPeriods: string[], recommendations: string[], alerts: string[], riskScore: number }',
    );
    return { data: { result, confidence: 0.85 } };
  }

  async patternAlerting(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId: userId, ...context }),
      'You are a leave pattern analysis AI. Identify concerning leave patterns in the team. Return JSON with: { patterns: string[], alerts: string[], flaggedEmployees: string[], recommendations: string[], insights: string[] }',
    );
    return { data: { result, confidence: 0.87 } };
  }

  async approvalCopilot(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId: userId, ...context }),
      'You are an approval assistance AI. Help managers make informed leave approval decisions. Return JSON with: { pendingApprovals: string[], approvalRecommendations: string[], riskFlags: string[], insights: string[], suggestions: string[] }',
    );
    return { data: { result, confidence: 0.83 } };
  }

  async quarterlyPlanningBrief(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId: userId, ...context }),
      'You are a quarterly planning AI. Generate a comprehensive leave planning brief for the upcoming quarter. Return JSON with: { quarterlyInsights: string[], peakLeavePeriods: string[], recommendations: string[], planningActions: string[], alerts: string[] }',
    );
    return { data: { result, confidence: 0.81 } };
  }

  // ─── Admin Features ───────────────────────────────────────────────────────

  async policyBenchmarking(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, adminId: userId, ...context }),
      'You are a leave policy benchmarking AI. Compare the organization\'s leave policies against industry standards. Return JSON with: { benchmarkFindings: string[], gaps: string[], recommendations: string[], industryComparisons: string[], insights: string[] }',
    );
    return { data: { result, confidence: 0.80 } };
  }

  async abuseDetection(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, adminId: userId, ...context }),
      'You are a leave abuse detection AI. Identify potential misuse or abuse of leave policies. Return JSON with: { suspiciousPatterns: string[], flaggedCases: string[], riskLevel: string, recommendations: string[], insights: string[] }',
    );
    return { data: { result, confidence: 0.91 } };
  }

  async liabilityForecast(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, adminId: userId, ...context }),
      'You are a leave liability forecasting AI. Project future leave liability costs and encashment obligations. Return JSON with: { liabilityProjections: string[], totalLiability: string, highRiskEmployees: string[], recommendations: string[], insights: string[] }',
    );
    return { data: { result, confidence: 0.84 } };
  }

  async regulatoryAutoUpdate(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, adminId: userId, ...context }),
      'You are a regulatory compliance AI for leave management. Monitor and suggest policy updates based on regulatory changes. Return JSON with: { regulatoryUpdates: string[], complianceGaps: string[], requiredActions: string[], deadlines: string[], alerts: string[] }',
    );
    return { data: { result, confidence: 0.89 } };
  }
}
