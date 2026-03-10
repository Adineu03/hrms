import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class ComplianceAiInsightsService {
  constructor(private readonly aiService: AiService) {}

  async regulatoryChangeMonitor(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Monitor and summarize recent regulatory changes that may impact HR compliance. Return JSON with: { changes: Array<{regulation: string, summary: string, effectiveDate: string, impact: string}>, summary: string, recommendations: string[], urgentActions: string[] }',
    );
    return { data: result };
  }

  async auditRiskPredictor(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Predict audit risk areas for the organization. Return JSON with: { riskScore: number, riskAreas: Array<{area: string, riskLevel: string, probability: string, impact: string}>, summary: string, recommendations: string[], confidence: number }',
    );
    return { data: result };
  }

  async complianceGapAnalysis(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Identify compliance gaps in the organization. Return JSON with: { gaps: Array<{area: string, description: string, severity: string, remediation: string}>, summary: string, recommendations: string[], gapCount: number }',
    );
    return { data: result };
  }

  async autoRemediationSuggestions(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Generate auto-remediation suggestions for compliance issues. Return JSON with: { suggestions: Array<{issue: string, action: string, priority: string, estimatedTime: string, automatable: boolean}>, summary: string, insights: string[] }',
    );
    return { data: result };
  }

  async teamComplianceRiskScore(orgId: string, managerId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId, ...context }),
      'Calculate team compliance risk score. Return JSON with: { riskScore: number, riskFactors: Array<{factor: string, score: number, description: string}>, summary: string, recommendations: string[], confidence: number }',
    );
    return { data: result };
  }

  async complianceCoach(orgId: string, employeeId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId, ...context }),
      'Provide personalized compliance guidance for an employee. Return JSON with: { guidance: Array<{topic: string, advice: string, priority: string}>, summary: string, nextSteps: string[], complianceScore: number }',
    );
    return { data: result };
  }
}
