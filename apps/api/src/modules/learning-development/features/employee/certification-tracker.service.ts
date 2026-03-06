import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, lte, gte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class CertificationTrackerService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async listMyCertifications(orgId: string, userId: string) {
    const rows = await this.db
      .select()
      .from(schema.certifications)
      .where(
        and(
          eq(schema.certifications.orgId, orgId),
          eq(schema.certifications.employeeId, userId),
          eq(schema.certifications.isActive, true),
        ),
      )
      .orderBy(desc(schema.certifications.createdAt));

    return { data: rows, meta: { total: rows.length } };
  }

  async addCertification(orgId: string, userId: string, data: Record<string, any>) {
    const [created] = await this.db
      .insert(schema.certifications)
      .values({
        orgId,
        employeeId: userId,
        name: data.name,
        issuingBody: data.issuingBody ?? null,
        credentialId: data.credentialId ?? null,
        credentialUrl: data.credentialUrl ?? null,
        issueDate: data.issueDate ?? null,
        expiryDate: data.expiryDate ?? null,
        renewalDate: data.renewalDate ?? null,
        cpeCredits: data.cpeCredits ?? 0,
        cpeEarned: data.cpeEarned ?? 0,
        status: data.status ?? 'active',
        proofUrl: data.proofUrl ?? null,
        proofFileName: data.proofFileName ?? null,
        metadata: data.metadata ?? {},
      })
      .returning();

    return created;
  }

  async getCertification(orgId: string, userId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(schema.certifications)
      .where(
        and(
          eq(schema.certifications.id, id),
          eq(schema.certifications.orgId, orgId),
          eq(schema.certifications.employeeId, userId),
          eq(schema.certifications.isActive, true),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Certification not found');
    return row;
  }

  async updateCertification(orgId: string, userId: string, id: string, data: Record<string, any>) {
    await this.getCertification(orgId, userId, id);
    const updates: Record<string, any> = { updatedAt: new Date() };
    const fields = [
      'name', 'issuingBody', 'credentialId', 'credentialUrl',
      'issueDate', 'expiryDate', 'renewalDate', 'cpeCredits', 'cpeEarned',
      'status', 'proofUrl', 'proofFileName', 'metadata',
    ];
    for (const f of fields) {
      if (data[f] !== undefined) updates[f] = data[f];
    }

    await this.db
      .update(schema.certifications)
      .set(updates)
      .where(
        and(
          eq(schema.certifications.id, id),
          eq(schema.certifications.orgId, orgId),
          eq(schema.certifications.employeeId, userId),
        ),
      );

    return this.getCertification(orgId, userId, id);
  }

  async deleteCertification(orgId: string, userId: string, id: string) {
    await this.getCertification(orgId, userId, id);
    await this.db
      .update(schema.certifications)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.certifications.id, id),
          eq(schema.certifications.orgId, orgId),
          eq(schema.certifications.employeeId, userId),
        ),
      );

    return { success: true, message: 'Certification deleted' };
  }

  async getExpiringCertifications(orgId: string, userId: string) {
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const sixtyDays = new Date();
    sixtyDays.setDate(sixtyDays.getDate() + 60);
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    const allCerts = await this.db
      .select()
      .from(schema.certifications)
      .where(
        and(
          eq(schema.certifications.orgId, orgId),
          eq(schema.certifications.employeeId, userId),
          eq(schema.certifications.isActive, true),
        ),
      )
      .orderBy(schema.certifications.expiryDate);

    const expiredCerts = allCerts.filter(
      (c) => c.expiryDate && new Date(c.expiryDate) < now,
    );

    const expiringIn30 = allCerts.filter(
      (c) => c.expiryDate && new Date(c.expiryDate) >= now && new Date(c.expiryDate) <= thirtyDays,
    );

    const expiringIn60 = allCerts.filter(
      (c) => c.expiryDate && new Date(c.expiryDate) > thirtyDays && new Date(c.expiryDate) <= sixtyDays,
    );

    const expiringIn90 = allCerts.filter(
      (c) => c.expiryDate && new Date(c.expiryDate) > sixtyDays && new Date(c.expiryDate) <= ninetyDays,
    );

    return {
      expired: { data: expiredCerts, count: expiredCerts.length },
      expiringIn30Days: { data: expiringIn30, count: expiringIn30.length },
      expiringIn60Days: { data: expiringIn60, count: expiringIn60.length },
      expiringIn90Days: { data: expiringIn90, count: expiringIn90.length },
    };
  }
}
