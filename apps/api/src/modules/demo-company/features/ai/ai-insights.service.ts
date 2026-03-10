import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class DemoAiInsightsService {
  constructor(private readonly aiService: AiService) {}

  async demoAiFeaturesShowcase(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Generate a showcase of AI features for demo purposes. Return JSON with: { highlights: Array<{feature: string, description: string, benefit: string, category: string}>, summary: string, insights: string[], totalFeatures: number }',
    );
    return { data: result };
  }

  async syntheticDataIntelligence(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Analyze synthetic demo data quality and provide insights. Return JSON with: { dataQualityScore: number, insights: Array<{category: string, observation: string, recommendation: string}>, summary: string, recommendations: string[], realism: string }',
    );
    return { data: result };
  }

  async demoTeamAnalytics(orgId: string, managerId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId, ...context }),
      'Generate demo team analytics insights. Return JSON with: { teamMetrics: Array<{metric: string, value: string, trend: string}>, summary: string, insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  async demoAiInsightsShowcase(orgId: string, employeeId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId, ...context }),
      'Generate a personalized AI insights showcase for a demo employee. Return JSON with: { personalizedInsights: Array<{title: string, description: string, actionable: boolean}>, summary: string, recommendations: string[], confidence: number }',
    );
    return { data: result };
  }
}
