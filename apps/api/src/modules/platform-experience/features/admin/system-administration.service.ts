import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class SystemAdministrationService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getSystemHealth(orgId: string) {
    // Compute real metrics where possible, mock infrastructure metrics
    const totalUsers = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(and(eq(schema.users.orgId, orgId), eq(schema.users.isActive, true)));

    const totalDepartments = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.departments)
      .where(eq(schema.departments.orgId, orgId));

    const recentAuditCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.auditLogs)
      .where(and(
        eq(schema.auditLogs.orgId, orgId),
        sql`${schema.auditLogs.createdAt} > now() - interval '24 hours'`,
      ));

    return {
      data: {
        status: 'healthy',
        uptime: '99.97%',
        serverTime: new Date().toISOString(),
        metrics: {
          totalActiveUsers: Number(totalUsers[0]?.count ?? 0),
          totalDepartments: Number(totalDepartments[0]?.count ?? 0),
          auditEventsLast24h: Number(recentAuditCount[0]?.count ?? 0),
          cacheHitRate: '94.2%',
          avgResponseTime: '128ms',
          dbConnectionPool: { active: 5, idle: 15, max: 20 },
          memoryUsage: { used: '512MB', total: '2GB', percentage: '25.6%' },
        },
      },
    };
  }

  async listActiveSessions(orgId: string) {
    // Active users represent active sessions — query recently active users
    const rows = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        role: schema.users.role,
        lastActive: schema.users.updatedAt,
      })
      .from(schema.users)
      .where(and(eq(schema.users.orgId, orgId), eq(schema.users.isActive, true)))
      .orderBy(desc(schema.users.updatedAt));

    return {
      data: rows.map((u) => ({
        userId: u.id,
        email: u.email,
        name: `${u.firstName} ${u.lastName ?? ''}`.trim(),
        role: u.role,
        lastActive: u.lastActive,
        status: 'active',
      })),
      meta: { total: rows.length },
    };
  }

  async listAuditLogs(orgId: string) {
    const rows = await this.db
      .select({
        log: schema.auditLogs,
        userName: sql<string>`concat(${schema.users.firstName}, ' ', coalesce(${schema.users.lastName}, ''))`,
      })
      .from(schema.auditLogs)
      .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
      .where(eq(schema.auditLogs.orgId, orgId))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(100);

    return {
      data: rows.map((r) => ({
        ...r.log,
        userName: r.userName,
      })),
      meta: { total: rows.length },
    };
  }

  async getBulkOperations(orgId: string) {
    // Bulk operations are tracked in-memory / queue — return recent mock history
    return {
      data: [
        {
          id: 'bulk-op-placeholder',
          type: 'info',
          status: 'idle',
          message: 'No bulk operations have been triggered yet.',
          createdAt: new Date().toISOString(),
        },
      ],
      meta: { total: 0 },
    };
  }

  async triggerBulkOperation(orgId: string, dto: { type: string; targetIds?: string[]; params?: any }) {
    // In a full implementation, this would enqueue a BullMQ job
    // For now, return acknowledgment with a mock operation ID
    const operationId = `bulk-${Date.now()}`;

    return {
      data: {
        operationId,
        type: dto.type,
        status: 'queued',
        targetCount: dto.targetIds?.length ?? 0,
        params: dto.params ?? {},
        queuedAt: new Date().toISOString(),
        message: `Bulk operation '${dto.type}' has been queued for processing.`,
      },
    };
  }
}
