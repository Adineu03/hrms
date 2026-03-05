import { Inject, Injectable } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { users } from '../../../../infrastructure/database/schema/users';
import { employeeProfiles } from '../../../../infrastructure/database/schema/employee-profiles';
import { documents } from '../../../../infrastructure/database/schema/documents';

export type ComplianceStatus = 'compliant' | 'expiring_soon' | 'expired' | 'missing';

export interface ComplianceItem {
  employeeId: string;
  employeeName: string;
  category: string;
  item: string;
  status: ComplianceStatus;
  expiryDate?: string | null;
  daysUntilExpiry?: number | null;
}

@Injectable()
export class TeamComplianceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getOverview(orgId: string, managerId: string): Promise<{
    items: ComplianceItem[];
    summary: Record<ComplianceStatus, number>;
  }> {
    // Get all direct reports
    const teamMembers = await this.db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        probationEndDate: employeeProfiles.probationEndDate,
      })
      .from(users)
      .innerJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
      .where(
        and(
          eq(employeeProfiles.managerId, managerId),
          eq(users.orgId, orgId),
        ),
      );

    if (teamMembers.length === 0) {
      return {
        items: [],
        summary: { compliant: 0, expiring_soon: 0, expired: 0, missing: 0 },
      };
    }

    const teamUserIds = teamMembers.map((m) => m.userId);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Get documents for all team members
    const docs = await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.orgId, orgId),
          inArray(documents.employeeId, teamUserIds),
        ),
      );

    const items: ComplianceItem[] = [];

    // Build a map of user names
    const nameMap = new Map(
      teamMembers.map((m) => [
        m.userId,
        [m.firstName, m.lastName].filter(Boolean).join(' '),
      ]),
    );

    // Check document expiry (visa, IDs, certificates)
    for (const doc of docs) {
      const employeeName = nameMap.get(doc.employeeId) ?? 'Unknown';

      if (doc.expiryDate) {
        const expiry = new Date(doc.expiryDate);
        let status: ComplianceStatus = 'compliant';

        if (expiry < now) {
          status = 'expired';
        } else if (expiry <= thirtyDaysFromNow) {
          status = 'expiring_soon';
        }

        const daysUntilExpiry = Math.ceil(
          (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        items.push({
          employeeId: doc.employeeId,
          employeeName,
          category: 'document',
          item: `${doc.category}: ${doc.name}`,
          status,
          expiryDate: doc.expiryDate,
          daysUntilExpiry,
        });
      }
    }

    // Check probation end dates
    for (const member of teamMembers) {
      if (member.probationEndDate) {
        const probEnd = new Date(member.probationEndDate);
        const employeeName = nameMap.get(member.userId) ?? 'Unknown';
        let status: ComplianceStatus = 'compliant';

        if (probEnd < now) {
          status = 'expired'; // Probation overdue for review
        } else if (probEnd <= thirtyDaysFromNow) {
          status = 'expiring_soon';
        }

        const daysUntilExpiry = Math.ceil(
          (probEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        items.push({
          employeeId: member.userId,
          employeeName,
          category: 'probation',
          item: 'Probation period end',
          status,
          expiryDate: member.probationEndDate,
          daysUntilExpiry,
        });
      }
    }

    // Build summary
    const summary: Record<ComplianceStatus, number> = {
      compliant: 0,
      expiring_soon: 0,
      expired: 0,
      missing: 0,
    };
    for (const item of items) {
      summary[item.status]++;
    }

    return { items, summary };
  }

  async getGaps(orgId: string, managerId: string) {
    const { items, summary } = await this.getOverview(orgId, managerId);
    const gaps = items.filter(
      (item) => item.status !== 'compliant',
    );

    return {
      gaps,
      totalGaps: gaps.length,
      summary: {
        expiring_soon: summary.expiring_soon,
        expired: summary.expired,
        missing: summary.missing,
      },
    };
  }
}
