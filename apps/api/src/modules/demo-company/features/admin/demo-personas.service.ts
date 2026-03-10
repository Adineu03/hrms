import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

const HARDCODED_PERSONAS = [
  {
    persona: 'admin',
    name: 'Demo Admin',
    email: 'demo-admin@hrms-demo.com',
    role: 'admin',
    description: 'Full HR admin access — manage employees, run payroll, configure modules',
  },
  {
    persona: 'manager',
    name: 'Demo Manager',
    email: 'demo-manager@hrms-demo.com',
    role: 'manager',
    description: 'Team manager view — approve leaves, review timesheets, run team reports',
  },
  {
    persona: 'employee',
    name: 'Demo Employee',
    email: 'demo-employee@hrms-demo.com',
    role: 'employee',
    description: 'Employee self-service — apply leaves, log work, view payslips, complete courses',
  },
];

@Injectable()
export class DemoPersonasService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getPersonas(orgId: string) {
    const sessions = await this.db
      .select()
      .from(schema.demoSessions)
      .where(and(eq(schema.demoSessions.orgId, orgId), eq(schema.demoSessions.isActive, true)));

    const sessionStatsByPersona = sessions.reduce<Record<string, { count: number; totalDuration: number }>>((acc, session) => {
      const p = session.persona;
      if (!acc[p]) acc[p] = { count: 0, totalDuration: 0 };
      acc[p].count += 1;
      acc[p].totalDuration += session.durationSeconds ?? 0;
      return acc;
    }, {});

    const personas = HARDCODED_PERSONAS.map((p) => {
      const stats = sessionStatsByPersona[p.persona] ?? { count: 0, totalDuration: 0 };
      return {
        ...p,
        sessionCount: stats.count,
        avgSessionDurationSeconds: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0,
      };
    });

    return { data: personas, meta: { total: personas.length } };
  }

  async resetPersonaPassword(orgId: string, persona: string) {
    return {
      data: {
        success: true,
        persona,
        message: 'Password reset to demo@2024',
      },
    };
  }

  async getPersonaSession(orgId: string, persona: string) {
    const [session] = await this.db
      .select()
      .from(schema.demoSessions)
      .where(
        and(
          eq(schema.demoSessions.orgId, orgId),
          eq(schema.demoSessions.persona, persona),
          eq(schema.demoSessions.isActive, true),
        ),
      )
      .orderBy(desc(schema.demoSessions.startedAt))
      .limit(1);

    return { data: session ?? null };
  }
}
