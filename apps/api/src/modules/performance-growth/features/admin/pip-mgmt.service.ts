import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PipMgmtService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listPIPs(orgId: string, status?: string) {
    const conditions: any[] = [eq(schema.developmentPlans.orgId, orgId), eq(schema.developmentPlans.type, 'pip'), eq(schema.developmentPlans.isActive, true)];
    if (status) conditions.push(eq(schema.developmentPlans.status, status));
    const rows = await this.db.select({ plan: schema.developmentPlans, employee: schema.users })
      .from(schema.developmentPlans)
      .innerJoin(schema.users, eq(schema.developmentPlans.employeeId, schema.users.id))
      .where(and(...conditions)).orderBy(desc(schema.developmentPlans.createdAt));
    return { data: rows.map(r => ({ ...r.plan, employeeName: `${r.employee.firstName} ${r.employee.lastName}` })), meta: { total: rows.length } };
  }

  async createPIP(orgId: string, createdBy: string, data: Record<string, any>) {
    const [created] = await this.db.insert(schema.developmentPlans).values({
      orgId, employeeId: data.employeeId, title: data.title, description: data.description ?? null,
      type: 'pip', activities: data.activities ?? [], pipMilestones: data.milestones ?? [],
      startDate: data.startDate ?? null, targetDate: data.targetDate ?? null, status: 'active', createdBy,
    }).returning();
    return created;
  }

  async getPIP(orgId: string, id: string) {
    const [row] = await this.db.select({ plan: schema.developmentPlans, employee: schema.users })
      .from(schema.developmentPlans)
      .innerJoin(schema.users, eq(schema.developmentPlans.employeeId, schema.users.id))
      .where(and(eq(schema.developmentPlans.id, id), eq(schema.developmentPlans.orgId, orgId), eq(schema.developmentPlans.type, 'pip'))).limit(1);
    if (!row) throw new NotFoundException('PIP not found');
    return { ...row.plan, employeeName: `${row.employee.firstName} ${row.employee.lastName}` };
  }

  async updatePIP(orgId: string, id: string, data: Record<string, any>) {
    await this.getPIP(orgId, id);
    const updates: Record<string, any> = { updatedAt: new Date() };
    const fields = ['title', 'description', 'activities', 'pipMilestones', 'progress', 'startDate', 'targetDate', 'status', 'metadata'];
    for (const f of fields) { if (data[f] !== undefined) updates[f] = data[f]; }
    await this.db.update(schema.developmentPlans).set(updates).where(and(eq(schema.developmentPlans.id, id), eq(schema.developmentPlans.orgId, orgId)));
    return this.getPIP(orgId, id);
  }

  async escalatePIP(orgId: string, id: string, data: Record<string, any>) {
    const pip = await this.getPIP(orgId, id);
    const history = Array.isArray(pip.escalationHistory) ? [...(pip.escalationHistory as any[])] : [];
    history.push({ action: data.action ?? 'escalated', reason: data.reason ?? '', date: new Date().toISOString(), by: data.escalatedBy ?? '' });
    await this.db.update(schema.developmentPlans).set({ escalationHistory: history, updatedAt: new Date() })
      .where(and(eq(schema.developmentPlans.id, id), eq(schema.developmentPlans.orgId, orgId)));
    return this.getPIP(orgId, id);
  }

  async closePIP(orgId: string, id: string, outcome: string) {
    await this.getPIP(orgId, id);
    await this.db.update(schema.developmentPlans).set({ status: 'completed', pipOutcome: outcome, completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.developmentPlans.id, id), eq(schema.developmentPlans.orgId, orgId)));
    return this.getPIP(orgId, id);
  }
}
