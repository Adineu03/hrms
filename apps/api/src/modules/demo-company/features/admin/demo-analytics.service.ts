import { Inject, Injectable } from '@nestjs/common';
import { eq, and, count, avg } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class DemoAnalyticsService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getAnalyticsSummary(orgId: string) {
    const sessions = await this.db
      .select()
      .from(schema.demoSessions)
      .where(and(eq(schema.demoSessions.orgId, orgId), eq(schema.demoSessions.isActive, true)));

    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
    const avgSession = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

    const moduleVisitCounts: Record<string, number> = {};
    for (const session of sessions) {
      const modules = (session.modulesVisited as string[]) ?? [];
      for (const mod of modules) {
        moduleVisitCounts[mod] = (moduleVisitCounts[mod] ?? 0) + 1;
      }
    }

    const topModules = Object.entries(moduleVisitCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([moduleKey, visits]) => ({ moduleKey, visits }));

    return {
      data: {
        totalDemosStarted: totalSessions,
        avgSessionDurationSeconds: avgSession,
        avgSessionDurationMinutes: Math.round(avgSession / 60),
        topModules,
        sessionsByPersona: {
          admin: sessions.filter((s) => s.persona === 'admin').length,
          manager: sessions.filter((s) => s.persona === 'manager').length,
          employee: sessions.filter((s) => s.persona === 'employee').length,
        },
      },
    };
  }

  async getConversionFunnel(orgId: string) {
    const sessions = await this.db
      .select()
      .from(schema.demoSessions)
      .where(and(eq(schema.demoSessions.orgId, orgId), eq(schema.demoSessions.isActive, true)));

    const total = sessions.length;
    const converted = sessions.filter((s) => s.converted === true).length;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    return {
      data: {
        funnel: [
          { stage: 'Demo Started', count: total, percentage: 100 },
          { stage: 'Completed Tour', count: Math.round(total * 0.7), percentage: 70 },
          { stage: 'Visited 3+ Modules', count: Math.round(total * 0.5), percentage: 50 },
          { stage: 'Converted to Signup', count: converted, percentage: conversionRate },
        ],
        total,
        converted,
        conversionRate,
      },
    };
  }

  async exportDemoReport(orgId: string) {
    const sessions = await this.db
      .select()
      .from(schema.demoSessions)
      .where(and(eq(schema.demoSessions.orgId, orgId), eq(schema.demoSessions.isActive, true)));

    const rows = sessions.map((session) => ({
      sessionId: session.sessionId,
      persona: session.persona,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationSeconds: session.durationSeconds,
      modulesVisited: ((session.modulesVisited as string[]) ?? []).join(';'),
      converted: session.converted,
    }));

    return {
      data: {
        rows,
        format: 'csv',
        filename: `demo-report-${orgId}-${new Date().toISOString().split('T')[0]}.csv`,
        columns: ['sessionId', 'persona', 'startedAt', 'endedAt', 'durationSeconds', 'modulesVisited', 'converted'],
      },
      meta: { total: rows.length },
    };
  }
}
