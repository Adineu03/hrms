import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class IntegrationsAiInsightsService {
  constructor(private readonly aiService: AiService) {}

  async integrationIntelligence(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Analyze integration health and usage patterns. Return JSON with: { insights: string[], topIntegrations: Array<{name: string, health: string, usage: string}>, summary: string, recommendations: string[], confidence: number }',
    );
    return { data: result };
  }

  async apiUsageOptimizer(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Analyze API usage patterns and suggest optimizations. Return JSON with: { optimizations: Array<{endpoint: string, issue: string, suggestion: string, impact: string}>, summary: string, recommendations: string[], potentialSavings: string }',
    );
    return { data: result };
  }

  async errorPatternAnalyzer(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Analyze API error patterns and root causes. Return JSON with: { patterns: Array<{errorType: string, frequency: string, rootCause: string, fix: string}>, summary: string, recommendations: string[], criticalErrors: number }',
    );
    return { data: result };
  }

  async dataSyncHealthMonitor(orgId: string, managerId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId, ...context }),
      'Monitor data sync health across integrations. Return JSON with: { healthScore: number, syncIssues: Array<{integration: string, issue: string, severity: string, lastSync: string}>, summary: string, recommendations: string[] }',
    );
    return { data: result };
  }

  async integrationStatusAssistant(orgId: string, employeeId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId, ...context }),
      'Provide integration status insights relevant to an employee. Return JSON with: { connectedApps: Array<{app: string, status: string, lastActivity: string}>, summary: string, insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }
}
