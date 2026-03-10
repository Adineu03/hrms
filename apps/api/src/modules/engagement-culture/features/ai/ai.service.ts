import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class EngagementCultureAiService {
  constructor(private readonly aiService: AiService) {}

  // Admin endpoints
  async sentimentAnalysisEngine(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Analyze survey open-ended responses using NLP for themes and sentiment. Return JSON with: { themes: Array<{theme: string, sentiment: string, frequency: number, trend: string}>, departmentComparison: Array<{department: string, overallSentiment: string, topIssue: string}>, insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  async cultureHealthScore(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Compute composite culture health score from surveys, attrition, recognition, and feedback data. Return JSON with: { overallScore: number, subScores: Array<{dimension: string, score: number, trend: string}>, benchmarkComparison: string, riskIndicators: string[], insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  async orgWideAttritionModel(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Predict who will leave, when, and why — with heat maps and retention budget recommendations. Return JSON with: { riskHeatMap: Array<{segment: string, riskScore: number, topFactor: string, estimatedLeavers: number}>, retentionBudgetAllocation: Array<{action: string, investment: number, estimatedRetention: number}>, insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  async engagementRoiCalculator(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Model financial impact of engagement initiatives and prioritize programs with highest retention ROI. Return JSON with: { roiAnalysis: Array<{initiative: string, investment: number, estimatedSavings: number, roi: string}>, topPrograms: string[], financialImpact: string, insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  // Manager endpoints
  async engagementDriverAnalysis(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Identify what specifically drives engagement for your team — not generic advice. Return JSON with: { topDrivers: Array<{driver: string, impactScore: number, teamSpecific: boolean, actionable: string}>, priorityActions: Array<{action: string, estimatedImpact: string, effort: string}>, insights: string[] }',
    );
    return { data: result };
  }

  async smartNudges(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Generate context-aware nudges for manager actions based on team engagement signals. Return JSON with: { nudges: Array<{type: string, message: string, urgency: string, recommendedAction: string, context: string}>, teamHealthSummary: string, suggestions: string[] }',
    );
    return { data: result };
  }

  async attritionRiskDashboard(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Per-person flight risk scores with contributing factors and retention interventions. Return JSON with: { riskProfiles: Array<{riskLevel: string, primaryFactors: string[], recommendedInterventions: string[], costOfLoss: string}>, teamRiskSummary: string, insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  async feedbackSummary(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Synthesize anonymous team feedback into actionable themes with sentiment analysis. Return JSON with: { themes: Array<{theme: string, frequency: number, sentiment: string, isNew: boolean}>, actionableInsights: string[], recurringIssues: string[], suggestions: string[] }',
    );
    return { data: result };
  }

  // Employee endpoints
  async personalizedWellness(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Suggest wellness resources based on work patterns and seasonal factors (privacy-safe, no personal data). Return JSON with: { wellnessTips: Array<{tip: string, category: string, reason: string}>, recommendedResources: Array<{resource: string, type: string, estimatedBenefit: string}>, insights: string[] }',
    );
    return { data: result };
  }

  async anonymousVoiceInsights(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Aggregate anonymous feedback into themes without attribution. Return JSON with: { trendingThemes: Array<{theme: string, upvotes: number, resonanceScore: number}>, companyWidePatterns: string[], insights: string[], suggestions: string[] }',
    );
    return { data: result };
  }

  async cultureMatchPulse(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Check alignment between daily work experiences and stated company values. Return JSON with: { alignmentScore: number, valueScores: Array<{value: string, alignmentLevel: string, trend: string}>, improvementActions: string[], insights: string[] }',
    );
    return { data: result };
  }
}
