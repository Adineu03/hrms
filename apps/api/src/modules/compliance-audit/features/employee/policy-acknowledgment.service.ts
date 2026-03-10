import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class PolicyAcknowledgmentService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getMyPolicies(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.compliancePolicies)
      .where(
        and(
          eq(schema.compliancePolicies.orgId, orgId),
          eq(schema.compliancePolicies.status, 'published'),
          eq(schema.compliancePolicies.isActive, true),
        ),
      )
      .orderBy(schema.compliancePolicies.createdAt);

    return { data: rows, meta: { total: rows.length } };
  }

  async getPolicyDetail(orgId: string, id: string) {
    const rows = await this.db
      .select()
      .from(schema.compliancePolicies)
      .where(and(eq(schema.compliancePolicies.id, id), eq(schema.compliancePolicies.orgId, orgId), eq(schema.compliancePolicies.isActive, true)));

    if (!rows.length) throw new NotFoundException('Compliance policy not found');

    return { data: rows[0] };
  }

  async acknowledgePolicyPolicy(orgId: string, userId: string, policyId: string) {
    const policy = await this.db
      .select()
      .from(schema.compliancePolicies)
      .where(and(eq(schema.compliancePolicies.id, policyId), eq(schema.compliancePolicies.orgId, orgId), eq(schema.compliancePolicies.isActive, true)));

    if (!policy.length) throw new NotFoundException('Compliance policy not found');

    const [row] = await this.db
      .insert(schema.policyAcknowledgments)
      .values({
        orgId,
        policyId,
        employeeId: userId,
        policyVersion: policy[0].version,
        acknowledgedAt: new Date(),
      })
      .returning();

    return { data: row };
  }

  async getPendingAcknowledgments(orgId: string, userId: string) {
    const [publishedPolicies, myAcknowledgments] = await Promise.all([
      this.db
        .select()
        .from(schema.compliancePolicies)
        .where(
          and(
            eq(schema.compliancePolicies.orgId, orgId),
            eq(schema.compliancePolicies.status, 'published'),
            eq(schema.compliancePolicies.mandatoryAcknowledgment, true),
            eq(schema.compliancePolicies.isActive, true),
          ),
        ),
      this.db
        .select()
        .from(schema.policyAcknowledgments)
        .where(and(eq(schema.policyAcknowledgments.orgId, orgId), eq(schema.policyAcknowledgments.employeeId, userId), eq(schema.policyAcknowledgments.isActive, true))),
    ]);

    const acknowledgedPolicyIds = new Set(myAcknowledgments.map((a) => a.policyId));
    const pendingPolicies = publishedPolicies.filter((p) => !acknowledgedPolicyIds.has(p.id));

    return { data: pendingPolicies, meta: { total: pendingPolicies.length } };
  }
}
