import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class ColdStartAiInsightsService {
  constructor(private readonly aiService: AiService) {}

  async aiColumnMapper(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Auto-map CSV column headers to HRMS fields. Return JSON with: { mappings: Array<{csvColumn: string, hrmsField: string, confidence: number, notes?: string}>, unmapped: string[], summary: string, recommendations: string[] }',
    );
    return { data: result };
  }

  async smartOrgChartBuilder(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Infer organizational hierarchy from employee data. Return JSON with: { hierarchy: Array<{level: number, role: string, parentRole?: string, headCount: number}>, suggestions: string[], summary: string, recommendations: string[], confidence: number }',
    );
    return { data: result };
  }

  async dataQualityScorer(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Score the quality of imported employee/organization data. Return JSON with: { overallScore: number, categoryScores: Array<{category: string, score: number, issues: string[]}>, summary: string, recommendations: string[], criticalIssues: string[] }',
    );
    return { data: result };
  }
}
