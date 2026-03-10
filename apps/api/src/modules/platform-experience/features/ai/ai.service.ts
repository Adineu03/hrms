import { Injectable } from '@nestjs/common';
import { AiService } from '../../../../shared/ai/ai.service';

@Injectable()
export class PlatformExperienceAiService {
  constructor(private readonly aiService: AiService) {}

  // Admin endpoints
  async autoWorkflowBuilder(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Describe a business process and generate an executable workflow definition. Return JSON with: { workflowName: string, steps: Array<{step: number, action: string, assignee: string, condition: string, notifications: string[]}>, conditions: Array<{condition: string, truePath: string, falsePath: string}>, approvers: string[], estimatedDuration: string, suggestions: string[] }',
    );
    return { data: result };
  }

  async anomalyWatchdog(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Detect unusual access patterns, data quality issues, and cross-module fraud signals. Return JSON with: { alerts: Array<{type: string, severity: string, description: string, affectedArea: string, recommendedAction: string}>, fraudSignals: Array<{signal: string, modules: string[], confidence: number}>, dataQualityIssues: string[], insights: string[] }',
    );
    return { data: result };
  }

  async aiGovernanceDashboard(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Provide governance overview of all AI features including bias audits and explainability. Return JSON with: { featureCards: Array<{feature: string, accuracy: number, biasRisk: string, dataThreshold: string, lastAudit: string}>, biasFlags: string[], accuracyTrends: Array<{feature: string, trend: string}>, recommendations: string[], insights: string[] }',
    );
    return { data: result };
  }

  async agenticHrOps(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'AI agents execute multi-step HR processes autonomously with human approval gates. Return JSON with: { agentTasks: Array<{agent: string, status: string, completedSteps: string[], pendingApprovals: string[], nextAction: string}>, efficiencyGains: Array<{process: string, timeSaved: string, errorReduction: string}>, insights: string[], recommendations: string[] }',
    );
    return { data: result };
  }

  // Manager endpoints
  async managerCopilot(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Surface what needs attention today and prioritize items by urgency and impact. Return JSON with: { priorityItems: Array<{item: string, urgency: string, impact: string, action: string, dueDate: string}>, teamSummary: string, learnedPatterns: string[], suggestions: string[] }',
    );
    return { data: result };
  }

  async naturalLanguageReports(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Generate reports from natural language queries about team data. Return JSON with: { queryExamples: Array<{query: string, result: string, visualization: string}>, reportSuggestions: string[], insights: string[], dataPoints: Array<{metric: string, value: string, trend: string}> }',
    );
    return { data: result };
  }

  // Employee endpoints
  async universalAiAssistant(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Demonstrate capabilities of the universal AI assistant for common HR tasks. Return JSON with: { capabilities: Array<{action: string, example: string, modules: string[]}>, sampleResponses: Array<{query: string, response: string}>, suggestions: string[] }',
    );
    return { data: result };
  }

  async intelligentSearch(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Show semantic search capabilities for HR documents and policies. Return JSON with: { searchCapabilities: Array<{feature: string, example: string, benefit: string}>, sampleResults: Array<{query: string, topResult: string, relevanceScore: number}>, insights: string[], suggestions: string[] }',
    );
    return { data: result };
  }

  async proactiveSuggestions(orgId: string, context?: Record<string, unknown>) {
    const result = await this.aiService.analyze(
      JSON.stringify({ orgId, ...context }),
      'Generate proactive, contextual suggestions based on employee work patterns and upcoming events. Return JSON with: { suggestions: Array<{suggestion: string, category: string, urgency: string, actionUrl: string}>, learnedPreferences: string[], upcomingDeadlines: Array<{item: string, dueDate: string, action: string}>, insights: string[] }',
    );
    return { data: result };
  }
}
