import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';
import { selfServiceRequests } from '../../../../infrastructure/database/schema/self-service-requests';

const REQUEST_TYPES = [
  {
    type: 'employment_verification',
    label: 'Employment Verification Letter',
    description:
      'Request a letter verifying your current employment status, designation, and tenure.',
  },
  {
    type: 'noc',
    label: 'No Objection Certificate (NOC)',
    description:
      'Request a No Objection Certificate for visa, loan, or other purposes.',
  },
  {
    type: 'experience_letter',
    label: 'Experience Letter',
    description:
      'Request an experience letter documenting your roles and responsibilities.',
  },
  {
    type: 'salary_certificate',
    label: 'Salary Certificate',
    description:
      'Request a certificate detailing your salary components for loan or visa purposes.',
  },
  {
    type: 'name_change',
    label: 'Name Change Request',
    description:
      'Request an official name change in company records. Supporting documents required.',
  },
  {
    type: 'bank_change',
    label: 'Bank Details Change',
    description:
      'Request to update your bank account details for salary disbursement.',
  },
  {
    type: 'address_change',
    label: 'Address Change Request',
    description:
      'Request to update your residential or permanent address in company records.',
  },
  {
    type: 'general',
    label: 'General Request',
    description:
      'Submit a general HR request that does not fall into the above categories.',
  },
];

@Injectable()
export class SelfServiceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async listRequests(orgId: string, userId: string) {
    const requests = await this.db
      .select()
      .from(selfServiceRequests)
      .where(
        and(
          eq(selfServiceRequests.orgId, orgId),
          eq(selfServiceRequests.employeeId, userId),
        ),
      )
      .orderBy(desc(selfServiceRequests.createdAt));

    return {
      requests: requests.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        priority: r.priority,
        subject: r.subject,
        description: r.description,
        slaDeadline: r.slaDeadline,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      })),
      total: requests.length,
    };
  }

  async getRequest(orgId: string, userId: string, id: string) {
    const [request] = await this.db
      .select()
      .from(selfServiceRequests)
      .where(
        and(
          eq(selfServiceRequests.id, id),
          eq(selfServiceRequests.orgId, orgId),
        ),
      )
      .limit(1);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.employeeId !== userId) {
      throw new ForbiddenException('You can only view your own requests');
    }

    return {
      id: request.id,
      type: request.type,
      status: request.status,
      priority: request.priority,
      subject: request.subject,
      description: request.description,
      data: request.data,
      attachments: request.attachments,
      reviewedBy: request.reviewedBy,
      reviewedAt: request.reviewedAt,
      reviewNotes: request.reviewNotes,
      generatedDocUrl: request.generatedDocUrl,
      slaDeadline: request.slaDeadline,
      createdAt: request.createdAt,
      completedAt: request.completedAt,
    };
  }

  async createRequest(
    orgId: string,
    userId: string,
    data: {
      type: string;
      subject: string;
      description?: string;
      data?: Record<string, any>;
      attachments?: string[];
    },
  ) {
    // Calculate SLA deadline (7 days from now)
    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + 7);

    const [request] = await this.db
      .insert(selfServiceRequests)
      .values({
        orgId,
        employeeId: userId,
        type: data.type,
        subject: data.subject,
        description: data.description ?? null,
        data: data.data ?? {},
        attachments: data.attachments ?? [],
        status: 'pending',
        priority: 'normal',
        slaDeadline,
      })
      .returning();

    return {
      message: 'Request submitted successfully',
      request: {
        id: request.id,
        type: request.type,
        status: request.status,
        subject: request.subject,
        slaDeadline: request.slaDeadline,
        createdAt: request.createdAt,
      },
    };
  }

  getRequestTypes() {
    return { types: REQUEST_TYPES };
  }
}
