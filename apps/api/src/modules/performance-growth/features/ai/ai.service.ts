import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class PerformanceGrowthAiService {
  constructor(private readonly aiService: AiService) {}

  // ── Employee ──────────────────────────────────────────────────────────────

  async aiReviewDraft(orgId: string, employeeId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId }),
      'Generate a self-assessment draft for the employee based on their goals, feedback received, and tracked achievements. Return JSON with: { draft: string, keyAccomplishments: string[], improvementAreas: string[], suggestedRating: string, confidence: number }',
    );
    return { data: result };
  }

  async goalSuggestions(orgId: string, employeeId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId }),
      'Recommend goals for the employee based on their role, team OKRs, skill gaps, and career path aspirations. Return JSON with: { suggestions: Array<{ goal: string, rationale: string, type: string, stretchLevel: string }>, alignedOkrs: string[], insights: string[] }',
    );
    return { data: result };
  }

  async careerPathSimulator(orgId: string, employeeId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId }),
      'Simulate career path trajectories for the employee. Show projected paths based on different skill/certification combinations. Return JSON with: { currentRole: string, paths: Array<{ title: string, timeToPromotion: string, requiredSkills: string[], requiredCertifications: string[], probability: number }>, recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  async feedbackDigest(orgId: string, employeeId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId }),
      'Summarize all received feedback into themes and actionable takeaways. Return JSON with: { themes: Array<{ theme: string, sentiment: string, frequency: number, examples: string[] }>, strengths: string[], growthAreas: string[], sentimentTrend: string, recommendations: string[] }',
    );
    return { data: result };
  }

  // ── Manager ───────────────────────────────────────────────────────────────

  async reviewCopilot(orgId: string, managerId: string, employeeId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId, employeeId }),
      'Draft a manager review for the employee based on performance data, feedback received, goal completion, and activity signals. Return JSON with: { draft: string, strengths: string[], developmentAreas: string[], suggestedRating: string, evidence: string[], confidence: number }',
    );
    return { data: result };
  }

  async biasDetector(orgId: string, managerId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId }),
      'Scan manager review text for potential biases: gendered language, recency bias, halo/horns effect. Analyze rating distribution across demographics. Return JSON with: { biasesFound: Array<{ type: string, severity: string, examples: string[], suggestion: string }>, ratingDistribution: Record<string, number>, overallRisk: string, recommendations: string[] }',
    );
    return { data: result };
  }

  async calibrationCopilot(orgId: string, managerId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId }),
      'Surface data inconsistencies in calibration: similar performers rated differently by different managers. Return JSON with: { inconsistencies: Array<{ employeeA: string, employeeB: string, ratingDifference: number, context: string }>, recommendedAdjustments: Array<{ employeeId: string, currentRating: string, suggestedRating: string, rationale: string }>, insights: string[] }',
    );
    return { data: result };
  }

  async performanceTrajectory(orgId: string, managerId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId }),
      'Predict performance trends for each team member for the next review cycle. Identify early warning signals and high-potential employees. Return JSON with: { teamMembers: Array<{ employeeId: string, name: string, currentTrend: string, predictedRating: string, risk: string, confidence: number, factors: string[] }>, highPotential: string[], earlyWarnings: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async realTimeSignals(orgId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId }),
      'Aggregate continuous performance signals from connected tools into live indicators. Detect anomalies in productivity, quality, and engagement. Return JSON with: { signals: Array<{ category: string, metric: string, value: number, trend: string, anomaly: boolean }>, anomalies: Array<{ type: string, affectedEmployees: number, severity: string, description: string }>, insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  async skillsGapAnalysis(orgId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId }),
      'Perform org-wide current vs required skills inventory. Identify critical gaps by department, role, and urgency. Return JSON with: { criticalGaps: Array<{ skill: string, department: string, currentLevel: number, requiredLevel: number, urgency: string, affectedRoles: string[] }>, totalGaps: number, topPriorityGaps: string[], learningRecommendations: string[], hiringNeeds: string[] }',
    );
    return { data: result };
  }

  async reviewQualityScorer(orgId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId }),
      'Score review quality across the org. Identify managers writing low-quality reviews (copy-paste, too short, no evidence). Return JSON with: { orgQualityScore: number, managerScores: Array<{ managerId: string, name: string, score: number, issues: string[], reviewCount: number }>, lowQualityReviewers: string[], coachingRecommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  async promotionEquityAudit(orgId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId }),
      'Analyze promotion patterns for systemic bias by gender, ethnicity, location, and tenure. Return JSON with: { overallEquityScore: number, disparities: Array<{ dimension: string, group: string, promotionRate: number, benchmarkRate: number, pValue: number, significant: boolean }>, riskAreas: string[], recommendations: string[], quarterlyReport: string }',
    );
    return { data: result };
  }
}
