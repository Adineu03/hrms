import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class WorkforceAiInsightsService {
  constructor(private readonly aiService: AiService) {}

  async headcountOptimizer(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Optimize headcount across the organization. Return JSON with: { recommendations: Array<{department: string, currentCount: number, recommendedCount: number, rationale: string}>, summary: string, insights: string[], potentialSavings: string, confidence: number }',
    );
    return { data: result };
  }

  async turnoverPredictor(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Predict employee turnover risk for the organization. Return JSON with: { riskScore: number, highRiskGroups: Array<{group: string, riskLevel: string, factors: string[]}>, prediction: string, recommendations: string[], confidence: number }',
    );
    return { data: result };
  }

  async workforceScenarioModeler(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Model workforce scenarios for strategic planning. Return JSON with: { scenarios: Array<{name: string, description: string, impact: string, feasibility: string}>, summary: string, recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  async skillsGapForecaster(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Forecast skills gaps in the organization over the next 12 months. Return JSON with: { gaps: Array<{skill: string, currentLevel: string, requiredLevel: string, urgency: string}>, summary: string, recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  async teamCapacityOptimizer(orgId: string, managerId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId, ...context }),
      'Optimize team capacity and workload distribution. Return JSON with: { capacityScore: number, overloadedMembers: Array<{name: string, overloadPercentage: number}>, underutilizedMembers: Array<{name: string, utilizationPercentage: number}>, recommendations: string[], summary: string }',
    );
    return { data: result };
  }

  async successionPlanningAssistant(orgId: string, managerId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId, ...context }),
      'Assist with succession planning for the team. Return JSON with: { successors: Array<{role: string, candidateName: string, readiness: string, developmentNeeds: string[]}>, risks: Array<{role: string, riskLevel: string, reason: string}>, recommendations: string[], summary: string }',
    );
    return { data: result };
  }

  async careerGrowthPredictor(orgId: string, employeeId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId, ...context }),
      'Predict career growth paths for an employee. Return JSON with: { prediction: string, growthPaths: Array<{role: string, timeframe: string, probability: string, requiredSkills: string[]}>, recommendations: string[], insights: string[], confidence: number }',
    );
    return { data: result };
  }
}
