import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class TalentAcquisitionAiService {
  constructor(private readonly aiService: AiService) {}

  // Admin endpoints
  async aiJdGenerator(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Generate an inclusive, SEO-optimized job description from the provided role requirements. Return JSON with: { title: string, summary: string, responsibilities: string[], requirements: string[], niceToHave: string[], biasFlags: string[], keywords: string[] }',
    );
    return { data: result };
  }

  async sourcingAgent(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Act as a sourcing agent to suggest talent sourcing strategies and candidate profiles. Return JSON with: { candidateProfiles: Array<{title: string, keySkills: string[], experienceYears: number, sources: string[]}>, outreachTemplates: Array<{channel: string, message: string}>, insights: string[] }',
    );
    return { data: result };
  }

  async recruitmentForecasting(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Predict hiring needs based on business plans, attrition models, and growth targets. Return JSON with: { quarterlyForecast: Array<{quarter: string, headcount: number, roles: string[], estimatedCost: number}>, attritionPredictions: Array<{department: string, riskLevel: string, count: number}>, recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  async biasAuditDashboard(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Analyze hiring pipeline for bias signals across demographics. Return JSON with: { biasSignals: Array<{stage: string, metric: string, value: string, severity: string}>, disparities: Array<{demographic: string, stage: string, conversionRate: number, benchmark: number}>, recommendations: string[], overallBiasScore: number }',
    );
    return { data: result };
  }

  // Manager endpoints
  async candidateRanking(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Rank candidates by fit score with explainable reasoning. Return JSON with: { rankings: Array<{name: string, score: number, rank: number, strengths: string[], concerns: string[], skillsMatch: number, experienceRelevance: number, cultureFit: number}>, insights: string[], topPick: string }',
    );
    return { data: result };
  }

  async interviewTranscriptAnalysis(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Analyze interview transcripts for competency signals and bias patterns. Return JSON with: { competencySignals: Array<{competency: string, evidence: string, rating: number}>, biasIndicators: Array<{type: string, example: string, severity: string}>, summary: string, hiringRecommendation: string, insights: string[] }',
    );
    return { data: result };
  }

  async offerIntelligence(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Suggest competitive compensation and model acceptance probability. Return JSON with: { recommendedRange: {min: number, mid: number, max: number, currency: string}, acceptanceProbability: Array<{offerAmount: number, probability: number}>, marketComparison: string, riskFlags: string[], suggestions: string[] }',
    );
    return { data: result };
  }

  async diversityPipelineNudges(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Analyze pipeline diversity and suggest improvements. Return JSON with: { currentMetrics: Array<{stage: string, diversityScore: number, benchmark: number}>, alerts: Array<{stage: string, issue: string, severity: string}>, sourcingRecommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  // Employee endpoints
  async smartReferralMatch(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Suggest people from the employee network who match open roles. Return JSON with: { matches: Array<{role: string, suggestedContacts: Array<{name: string, fitPercentage: number, matchReasons: string[]}>, openPositions: number}>, insights: string[] }',
    );
    return { data: result };
  }

  async interviewPrepCopilot(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Generate role-specific interview questions and evaluation rubric. Return JSON with: { questions: Array<{question: string, competency: string, evaluationCriteria: string[], redFlags: string[]}>, rubric: Array<{competency: string, weight: number, scoringGuide: string}>, tips: string[] }',
    );
    return { data: result };
  }

  async internalMobilityMatch(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Suggest internal job opportunities matching employee skills and interests. Return JSON with: { matches: Array<{role: string, department: string, fitScore: number, matchedSkills: string[], skillGaps: string[], learningPaths: string[]}>, insights: string[], suggestions: string[] }',
    );
    return { data: result };
  }
}
