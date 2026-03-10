import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class OnboardingOffboardingAiService {
  constructor(private readonly aiService: AiService) {}

  // Admin endpoints
  async processOptimization(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Analyze onboarding completion times and identify bottlenecks. Return JSON with: { bottlenecks: Array<{step: string, avgDays: number, recommendation: string}>, departmentComparison: Array<{department: string, avgOnboardingDays: number, score: number}>, topIssues: string[], insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  async exitInterviewAnalyzer(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Perform NLP analysis of exit interview data for themes and sentiment. Return JSON with: { topReasons: Array<{reason: string, frequency: number, sentiment: string}>, departmentInsights: Array<{department: string, topIssue: string}>, trendComparison: string, recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  async predictiveAttritionModel(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Build org-wide flight risk scores and retention recommendations. Return JSON with: { riskDistribution: {high: number, medium: number, low: number}, keyFactors: Array<{factor: string, impact: string, weight: number}>, departmentRisks: Array<{department: string, riskScore: number, topFactor: string}>, retentionROI: Array<{action: string, estimatedImpact: string, cost: string}>, insights: string[] }',
    );
    return { data: result };
  }

  // Manager endpoints
  async onboardingRiskAlert(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Flag new hires showing disengagement signals with risk scoring. Return JSON with: { riskAlerts: Array<{employeeName: string, riskLevel: string, signals: string[], recommendedActions: string[]}>, teamHealth: string, insights: string[], suggestions: string[] }',
    );
    return { data: result };
  }

  async smartKnowledgeTransfer(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Auto-generate handover recommendations and identify critical knowledge areas. Return JSON with: { criticalKnowledgeAreas: Array<{area: string, currentOwner: string, suggestedRecipients: string[], urgency: string}>, handoverTemplate: Array<{section: string, content: string}>, insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  async exitPrediction(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Identify flight risk signals and suggest proactive retention interventions. Return JSON with: { flightRisks: Array<{riskScore: number, primaryFactors: string[], interventions: string[]}>, earlySignals: string[], retentionStrategies: string[], insights: string[] }',
    );
    return { data: result };
  }

  // Employee endpoints
  async personalizedOnboarding(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Create a personalized onboarding path adapted by role, seniority, and location. Return JSON with: { onboardingPath: Array<{day: number, activities: string[], priority: string}>, contentRecommendations: Array<{type: string, title: string, estimatedTime: string}>, milestones: Array<{milestone: string, targetDay: number}>, insights: string[] }',
    );
    return { data: result };
  }

  async aiOnboardingBuddy(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Provide helpful answers for common new hire questions from the company knowledge base. Return JSON with: { commonQuestions: Array<{question: string, answer: string, category: string}>, helpfulResources: Array<{title: string, category: string, url: string}>, suggestions: string[] }',
    );
    return { data: result };
  }

  async sentimentTracking(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Monitor first 90 days experience and identify early disengagement signals. Return JSON with: { sentimentTrend: Array<{week: number, score: number, label: string}>, engagementSignals: Array<{signal: string, status: string, severity: string}>, recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }
}
