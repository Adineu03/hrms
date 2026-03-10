import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class LearningDevelopmentAiService {
  constructor(private readonly aiService: AiService) {}

  // Admin endpoints
  async aiContentGenerator(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Create micro-courses from internal SOPs, policies, and documents. Return JSON with: { generatedModules: Array<{title: string, duration: string, sections: Array<{title: string, content: string}>, quizQuestions: Array<{question: string, options: string[], answer: string}>}>, insights: string[], suggestions: string[] }',
    );
    return { data: result };
  }

  async skillTaxonomyEngine(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Build and maintain org-wide skill taxonomy from JDs, learning data, and market trends. Return JSON with: { taxonomy: Array<{category: string, skills: Array<{name: string, level: string, marketDemand: string}>}>, normalizationSuggestions: Array<{existing: string, normalized: string}>, emergingSkills: string[], insights: string[] }',
    );
    return { data: result };
  }

  async learningImpactModeler(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Model ROI of proposed learning investments and scenario planning. Return JSON with: { scenarios: Array<{name: string, investment: number, projectedROI: string, skillGapClosed: string, timeframe: string}>, recommendations: string[], insights: string[], costComparison: Array<{option: string, cost: number, impact: string}> }',
    );
    return { data: result };
  }

  // Manager endpoints
  async teamSkillMap(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Generate visual team skill map with gaps and single-person dependencies. Return JSON with: { skillCoverage: Array<{skill: string, teamStrength: string, coverage: number, singleOwner: boolean}>, criticalGaps: string[], learningInvestments: Array<{skill: string, priority: string, recommendedCourses: string[]}>, insights: string[] }',
    );
    return { data: result };
  }

  async learningRoiInsights(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Connect training completion to performance improvement. Return JSON with: { programROI: Array<{program: string, completionRate: number, performanceImprovement: string, cost: number}>, topPerformingCourses: string[], lowROICourses: string[], insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  async developmentCopilot(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Suggest personalized development plans per team member based on gaps and high-performer patterns. Return JSON with: { developmentPlans: Array<{role: string, currentLevel: string, keyGaps: string[], recommendedActions: string[], timeline: string}>, teamPriorityAreas: string[], insights: string[] }',
    );
    return { data: result };
  }

  // Employee endpoints
  async aiLearningCurator(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Recommend courses based on skill gaps, career goals, learning style, and high-performer patterns. Return JSON with: { recommendations: Array<{title: string, provider: string, duration: string, relevanceScore: number, skillsGained: string[], reason: string}>, learningPath: Array<{order: number, course: string, milestone: string}>, insights: string[] }',
    );
    return { data: result };
  }

  async aiTutor(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Provide instant course content explanations and generate practice quizzes. Return JSON with: { conceptExplanations: Array<{concept: string, explanation: string, examples: string[]}>, practiceQuestions: Array<{question: string, type: string, difficulty: string}>, suggestions: string[] }',
    );
    return { data: result };
  }

  async skillInferenceEngine(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Detect skills from projects, code commits, documents, and completed courses. Return JSON with: { inferredSkills: Array<{skill: string, confidence: number, evidenceSources: string[], category: string}>, profileEnrichments: string[], recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }
}
