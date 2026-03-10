import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class CompensationRewardsAiService {
  constructor(private readonly aiService: AiService) {}

  // Admin endpoints
  async payEquityAnalyzer(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Detect and quantify pay gaps by gender, ethnicity, age, and location with statistical regression. Return JSON with: { gapsDetected: Array<{dimension: string, gap: number, significance: string, affectedEmployees: number}>, remediationCost: number, scenarios: Array<{approach: string, cost: number, timeline: string}>, insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  async totalRewardsOptimizer(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Find benefit mix maximizing employee satisfaction per dollar spent. Return JSON with: { utilizationAnalysis: Array<{benefit: string, utilization: number, cost: number, satisfactionScore: number}>, reallocationOpportunities: Array<{from: string, to: string, estimatedImpact: string}>, recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  async scenarioPlanner(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Model cost impact of compensation changes: promotions, new bands, market adjustments. Return JSON with: { scenarios: Array<{name: string, description: string, totalCost: number, impactedEmployees: number, recommendation: string}>, budgetImpact: string, insights: string[], suggestions: string[] }',
    );
    return { data: result };
  }

  async marketIntelligenceFeed(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Provide real-time compensation benchmark insights and competitive intelligence. Return JSON with: { marketUpdates: Array<{role: string, currentBand: string, marketRate: string, gap: string, urgency: string}>, trendAlerts: string[], competitiveInsights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  // Manager endpoints
  async smartRaiseRecommender(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Suggest raise amounts optimized for retention, equity, budget, and market per person. Return JSON with: { recommendations: Array<{employeeLevel: string, suggestedIncrease: string, priority: string, rationale: string, retentionImpact: string}>, budgetUtilization: string, insights: string[], suggestions: string[] }',
    );
    return { data: result };
  }

  async retentionCompModel(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Model impact of compensation changes on flight risk for team members. Return JSON with: { retentionModels: Array<{scenario: string, raiseAmount: string, retentionProbability: number, flightRiskReduction: string}>, diminishingReturns: string, nonMonetaryActions: string[], insights: string[] }',
    );
    return { data: result };
  }

  async recognitionNudges(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Identify team members who deserve recognition based on activity signals and distribution equity. Return JSON with: { nudges: Array<{employeeLevel: string, achievement: string, recommendedAction: string, urgency: string}>, distributionAnalysis: string, suggestions: string[], insights: string[] }',
    );
    return { data: result };
  }

  // Employee endpoints
  async compClarityBot(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Explain compensation components, bonus calculations, equity vesting, and market positioning. Return JSON with: { compBreakdown: Array<{component: string, explanation: string, value: string}>, bonusCalculation: string, marketComparison: string, insights: string[], suggestions: string[] }',
    );
    return { data: result };
  }

  async taxSmartInsights(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Suggest optimal equity exercise timing and model tax implications of different strategies. Return JSON with: { exerciseStrategies: Array<{strategy: string, taxImplication: string, estimatedTax: string, recommendation: string}>, upcomingWindows: string[], alerts: string[], insights: string[] }',
    );
    return { data: result };
  }

  async rewardsRecommender(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Suggest how to maximize benefits and perks based on usage patterns and life stage. Return JSON with: { unusedBenefits: Array<{benefit: string, value: string, recommendation: string}>, optimizationTips: string[], personalizedSuggestions: string[], insights: string[] }',
    );
    return { data: result };
  }
}
