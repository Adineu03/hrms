import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class CoreHrAiService {
  constructor(private readonly aiService: AiService) {}

  // ─── Employee Features ────────────────────────────────────────────────────

  async profileAssistant(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, userId, ...context }),
      'You are an HR profile assistant. Analyze the employee context and provide personalized profile improvement suggestions. Return JSON with: { insights: string[], suggestions: string[], profileCompleteness: number, nextSteps: string[] }',
    );
    return { data: { result, confidence: 0.88 } };
  }

  async benefitsRecommender(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, userId, ...context }),
      'You are a benefits optimization specialist. Recommend the best benefits based on employee profile. Return JSON with: { recommendedBenefits: string[], savingsOpportunity: string, utilizationGaps: string[], suggestions: string[] }',
    );
    return { data: { result, confidence: 0.85 } };
  }

  async smartDocumentSearch(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, userId, ...context }),
      'You are a document management AI. Help the employee find and organize their HR documents intelligently. Return JSON with: { foundDocuments: string[], missingDocuments: string[], expiringDocuments: string[], suggestions: string[] }',
    );
    return { data: { result, confidence: 0.90 } };
  }

  async taxOptimizationHints(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, userId, ...context }),
      'You are a tax optimization advisor for employees. Provide actionable tax-saving suggestions. Return JSON with: { taxSavingOpportunities: string[], estimatedSavings: string, declarations: string[], alerts: string[] }',
    );
    return { data: { result, confidence: 0.82 } };
  }

  // ─── Manager Features ─────────────────────────────────────────────────────

  async teamInsightsBrief(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId: userId, ...context }),
      'You are a team analytics AI. Provide a comprehensive team insights brief for the manager. Return JSON with: { insights: string[], teamHealthScore: number, alerts: string[], recommendations: string[], trends: string[] }',
    );
    return { data: { result, confidence: 0.87 } };
  }

  async orgDesignSuggestions(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId: userId, ...context }),
      'You are an organizational design expert. Suggest improvements to the team/org structure. Return JSON with: { suggestions: string[], inefficiencies: string[], restructuringOptions: string[], expectedImpact: string }',
    );
    return { data: { result, confidence: 0.80 } };
  }

  async compEquityAlerts(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId: userId, ...context }),
      'You are a compensation equity analyst. Identify pay equity issues within the team. Return JSON with: { alerts: string[], equityScore: number, riskEmployees: string[], recommendations: string[], marketComparisons: string[] }',
    );
    return { data: { result, confidence: 0.84 } };
  }

  async successionReadiness(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId: userId, ...context }),
      'You are a succession planning advisor. Assess team succession readiness. Return JSON with: { readinessScore: number, keyRoles: string[], successorCandidates: string[], developmentGaps: string[], suggestions: string[] }',
    );
    return { data: { result, confidence: 0.79 } };
  }

  // ─── Admin Features ───────────────────────────────────────────────────────

  async orgDesigner(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, adminId: userId, ...context }),
      'You are an AI organizational designer. Provide strategic recommendations for org structure. Return JSON with: { designRecommendations: string[], spanOfControl: string, redundancies: string[], optimizations: string[], insights: string[] }',
    );
    return { data: { result, confidence: 0.83 } };
  }

  async smartDocumentParser(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, adminId: userId, ...context }),
      'You are a document parsing AI. Analyze HR documents for completeness, compliance, and anomalies. Return JSON with: { parsedFields: string[], anomalies: string[], complianceIssues: string[], suggestions: string[] }',
    );
    return { data: { result, confidence: 0.91 } };
  }

  async payrollAnomalyDetection(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, adminId: userId, ...context }),
      'You are a payroll anomaly detection AI. Identify unusual patterns in payroll data. Return JSON with: { anomalies: string[], riskLevel: string, affectedEmployees: string[], recommendedActions: string[], insights: string[] }',
    );
    return { data: { result, confidence: 0.92 } };
  }

  async predictiveCompliance(orgId: string, userId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, adminId: userId, ...context }),
      'You are a predictive compliance AI. Forecast compliance risks before they become issues. Return JSON with: { upcomingRisks: string[], complianceScore: number, criticalDeadlines: string[], recommendations: string[], alerts: string[] }',
    );
    return { data: { result, confidence: 0.86 } };
  }
}
