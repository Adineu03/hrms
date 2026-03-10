import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class PeopleAnalyticsAiService {
  constructor(private readonly aiService: AiService) {}

  // ── Employee ──────────────────────────────────────────────────────────────

  async personalGrowthInsights(orgId: string, employeeId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, employeeId }),
      'Generate an AI-powered quarterly growth summary for the employee: skills developed, goals achieved, feedback themes. Predict career progression probability. Return JSON with: { quarterlySummary: string, skillsDeveloped: string[], goalsAchieved: string[], feedbackThemes: string[], careerProgressionProbability: number, nextQuarterSuggestions: string[], insights: string[] }',
    );
    return { data: result };
  }

  // ── Manager ───────────────────────────────────────────────────────────────

  async naturalLanguageAnalytics(orgId: string, managerId: string, question: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId, question }),
      `Answer the following people analytics question in plain English and generate a structured data response. Question: "${question}". Return JSON with: { answer: string, chartType: string, data: Record<string, unknown>, insights: string[], followUpQuestions: string[] }`,
    );
    return { data: result };
  }

  async predictiveTeamInsights(orgId: string, managerId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId }),
      'Generate predictive insights for the manager\'s team: flight risk per member, performance trajectory for next cycle, engagement trend forecast. Return JSON with: { flightRisks: Array<{ employeeId: string, name: string, riskLevel: string, confidence: number, contributingFactors: string[] }>, performanceForecasts: Array<{ employeeId: string, name: string, predictedRating: string, trend: string }>, engagementForecast: string, recommendations: string[] }',
    );
    return { data: result };
  }

  async anomalyOpportunitySpotter(orgId: string, managerId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, managerId }),
      'Surface unexpected insights, anomalies, and positive correlations in team people data. Detect unusual patterns in attendance, engagement, productivity. Return JSON with: { positiveInsights: Array<{ insight: string, impact: string, evidence: string }>, anomalies: Array<{ type: string, description: string, severity: string, affectedMembers: string[] }>, weeklyDigest: string, recommendations: string[] }',
    );
    return { data: result };
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async predictiveWorkforceIntelligence(orgId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId }),
      'Generate org-wide workforce intelligence: attrition prediction, hiring demand forecasting, engagement trajectory, productivity trend. Return JSON with: { attritionPrediction: { orgRate: number, departments: Array<{ name: string, rate: number, risk: string }> }, hiringDemandForecast: Array<{ role: string, quantity: number, timeframe: string, reason: string }>, engagementTrajectory: string, productivityForecast: string, earlyWarnings: string[], confidence: number }',
    );
    return { data: result };
  }

  async automatedInsightsEngine(orgId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId }),
      'Proactively surface significant trends, anomalies, and correlations across all people data. Generate weekly insights digest for HR leadership with root cause analysis. Return JSON with: { insights: Array<{ title: string, description: string, impact: string, urgency: string, rootCause: string, recommendation: string }>, weeklyDigest: string, monthlyDigest: string, topPriority: string }',
    );
    return { data: result };
  }

  async naturalLanguageBi(orgId: string, question: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, question }),
      `Answer this org-wide people analytics question with full analysis and exportable data. Question: "${question}". Return JSON with: { answer: string, methodology: string, chartType: string, data: Record<string, unknown>, insights: string[], caveats: string[], exportFormat: string }`,
    );
    return { data: result };
  }

  async aiStoryteller(orgId: string): Promise<Record<string, unknown>> {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId }),
      'Generate a narrative summary of HR dashboards for board presentations. Convert data into plain-English insights. Auto-generate quarterly people review with key themes, risks, and recommendations. Return JSON with: { executiveSummary: string, keyThemes: string[], risks: Array<{ risk: string, impact: string, mitigation: string }>, recommendations: string[], quarterlyHighlights: string[], boardReadyNarrative: string }',
    );
    return { data: result };
  }
}
