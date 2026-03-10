import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class ExpenseAiInsightsService {
  constructor(private readonly aiService: AiService) {}

  async expenseIntelligence(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Analyze expense patterns and provide intelligence insights. Return JSON with: { insights: string[], topCategories: Array<{name: string, trend: string, amount: string}>, summary: string, recommendations: string[], confidence: number }',
    );
    return { data: result };
  }

  async policyEffectiveness(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Evaluate expense policy effectiveness. Return JSON with: { effectivenessScore: number, policyGaps: Array<{policy: string, issue: string, impact: string}>, summary: string, recommendations: string[] }',
    );
    return { data: result };
  }

  async anomalyDetection(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Detect expense anomalies and potential fraud patterns. Return JSON with: { anomalies: Array<{description: string, severity: string, amount?: number, category?: string}>, summary: string, recommendations: string[], riskScore: number }',
    );
    return { data: result };
  }

  async budgetForecasting(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Forecast expense budget for next quarter. Return JSON with: { prediction: string, departmentForecasts: Array<{department: string, forecast: string, confidence: string}>, summary: string, recommendations: string[], confidence: number }',
    );
    return { data: result };
  }

  async expensePatternAnalysis(orgId: string, managerId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId, ...context }),
      'Analyze expense patterns for a manager\'s team. Return JSON with: { patterns: Array<{description: string, trend: string, category: string}>, summary: string, recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  async fraudRiskScoring(orgId: string, managerId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId, ...context }),
      'Score fraud risk for expense claims in the team. Return JSON with: { riskScore: number, highRiskItems: Array<{description: string, riskLevel: string, reason: string}>, summary: string, recommendations: string[] }',
    );
    return { data: result };
  }

  async smartReceiptScanner(orgId: string, employeeId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId, ...context }),
      'Simulate smart receipt OCR and data extraction. Return JSON with: { extractedData: {merchant?: string, amount?: string, date?: string, category?: string}, confidence: number, suggestions: string[], summary: string }',
    );
    return { data: result };
  }

  async expenseCategorization(orgId: string, employeeId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId, ...context }),
      'Suggest expense categorization for submitted expenses. Return JSON with: { suggestions: Array<{expenseDesc: string, suggestedCategory: string, confidence: number}>, summary: string, insights: string[] }',
    );
    return { data: result };
  }

  async policyComplianceChecker(orgId: string, employeeId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId, ...context }),
      'Check employee expense submissions for policy compliance. Return JSON with: { complianceScore: number, violations: Array<{description: string, policy: string, severity: string}>, summary: string, recommendations: string[] }',
    );
    return { data: result };
  }
}
