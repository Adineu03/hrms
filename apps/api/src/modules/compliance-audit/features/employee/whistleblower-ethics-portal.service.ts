import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class WhistleblowerEthicsPortalService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async submitComplaint(
    orgId: string,
    userId: string,
    dto: {
      category: string;
      description: string;
      incidentDate?: string;
      location?: string;
      isAnonymous?: boolean;
    },
  ) {
    const referenceCode = 'ETH-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const isAnonymous = dto.isAnonymous ?? false;

    const [row] = await this.db
      .insert(schema.ethicsComplaints)
      .values({
        orgId,
        referenceCode,
        category: dto.category,
        description: dto.description,
        incidentDate: dto.incidentDate ? new Date(dto.incidentDate) : null,
        location: dto.location ?? null,
        isAnonymous,
        reporterEmployeeId: isAnonymous ? null : userId,
        status: 'received',
      })
      .returning();

    return {
      data: {
        referenceCode: row.referenceCode,
        status: row.status,
        createdAt: row.createdAt,
        message: 'Your complaint has been submitted. Use the reference code to track its status.',
      },
    };
  }

  async trackComplaintStatus(orgId: string, referenceCode: string) {
    const rows = await this.db
      .select()
      .from(schema.ethicsComplaints)
      .where(and(eq(schema.ethicsComplaints.orgId, orgId), eq(schema.ethicsComplaints.referenceCode, referenceCode), eq(schema.ethicsComplaints.isActive, true)));

    if (!rows.length) throw new NotFoundException('Complaint not found for reference code: ' + referenceCode);

    const complaint = rows[0];

    return {
      data: {
        referenceCode: complaint.referenceCode,
        status: complaint.status,
        updatedAt: complaint.updatedAt,
        closedAt: complaint.closedAt,
      },
    };
  }

  async getEthicsHotlineInfo(orgId: string) {
    return {
      data: {
        hotlineNumber: '1-800-ETHICS-1',
        email: 'ethics@company.com',
        webPortal: 'https://ethics.company.com',
        availability: '24/7',
        languages: ['English', 'Hindi', 'Spanish'],
        description: 'Our ethics hotline is a confidential reporting channel for employees to report concerns about violations of our Code of Conduct, legal violations, or other ethical issues.',
        guidelines: [
          'All reports are treated with strict confidentiality.',
          'Retaliation against reporters is strictly prohibited.',
          'Anonymous reporting is available.',
          'All reports are investigated by the Ethics & Compliance team.',
        ],
      },
    };
  }
}
