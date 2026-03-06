import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, inArray, gte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TeamHiringReportsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async getManagerRequisitionIds(orgId: string, managerId: string): Promise<string[]> {
    const reqs = await this.db
      .select({ id: schema.jobRequisitions.id })
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.orgId, orgId),
          eq(schema.jobRequisitions.createdBy, managerId),
          eq(schema.jobRequisitions.isActive, true),
        ),
      );
    return reqs.map((r) => r.id);
  }

  async getOverview(orgId: string, managerId: string) {
    const requisitions = await this.db
      .select({
        id: schema.jobRequisitions.id,
        title: schema.jobRequisitions.title,
        headcount: schema.jobRequisitions.headcount,
        filledCount: schema.jobRequisitions.filledCount,
        status: schema.jobRequisitions.status,
        priority: schema.jobRequisitions.priority,
        targetHireDate: schema.jobRequisitions.targetHireDate,
        departmentName: schema.departments.name,
        createdAt: schema.jobRequisitions.createdAt,
      })
      .from(schema.jobRequisitions)
      .leftJoin(schema.departments, eq(schema.jobRequisitions.departmentId, schema.departments.id))
      .where(
        and(
          eq(schema.jobRequisitions.orgId, orgId),
          eq(schema.jobRequisitions.createdBy, managerId),
          eq(schema.jobRequisitions.isActive, true),
        ),
      )
      .orderBy(desc(schema.jobRequisitions.createdAt));

    let totalHeadcount = 0;
    let totalFilled = 0;
    const statusBreakdown: Record<string, number> = {};
    const priorityBreakdown: Record<string, number> = {};

    const positions = requisitions.map((req) => {
      totalHeadcount += req.headcount;
      totalFilled += req.filledCount ?? 0;
      statusBreakdown[req.status] = (statusBreakdown[req.status] ?? 0) + 1;
      if (req.priority) {
        priorityBreakdown[req.priority] = (priorityBreakdown[req.priority] ?? 0) + 1;
      }

      return {
        requisitionId: req.id,
        title: req.title,
        department: req.departmentName ?? 'Unassigned',
        headcount: req.headcount,
        filledCount: req.filledCount ?? 0,
        openPositions: req.headcount - (req.filledCount ?? 0),
        status: req.status,
        priority: req.priority,
        targetHireDate: req.targetHireDate,
        createdAt: req.createdAt?.toISOString?.() ?? req.createdAt,
      };
    });

    return {
      summary: {
        totalRequisitions: requisitions.length,
        totalHeadcount,
        totalFilled,
        totalOpen: totalHeadcount - totalFilled,
        fillRate: totalHeadcount > 0
          ? Math.round((totalFilled / totalHeadcount) * 10000) / 100
          : 0,
        statusBreakdown,
        priorityBreakdown,
      },
      positions,
    };
  }

  async getTimeToFill(orgId: string, managerId: string) {
    const reqIds = await this.getManagerRequisitionIds(orgId, managerId);

    if (reqIds.length === 0) {
      return {
        averageDays: 0,
        medianDays: 0,
        breakdown: [],
      };
    }

    // Get requisitions with their creation dates
    const requisitions = await this.db
      .select({
        id: schema.jobRequisitions.id,
        title: schema.jobRequisitions.title,
        status: schema.jobRequisitions.status,
        createdAt: schema.jobRequisitions.createdAt,
      })
      .from(schema.jobRequisitions)
      .where(
        and(
          eq(schema.jobRequisitions.orgId, orgId),
          inArray(schema.jobRequisitions.id, reqIds),
        ),
      );

    // Get accepted offers for these requisitions
    const offers = await this.db
      .select({
        requisitionId: schema.offerLetters.requisitionId,
        acceptedAt: schema.offerLetters.acceptedAt,
        createdAt: schema.offerLetters.createdAt,
      })
      .from(schema.offerLetters)
      .where(
        and(
          eq(schema.offerLetters.orgId, orgId),
          inArray(schema.offerLetters.requisitionId, reqIds),
          eq(schema.offerLetters.status, 'accepted'),
        ),
      );

    // Map offers by requisition for first accepted date
    const firstAcceptedMap = new Map<string, Date>();
    for (const offer of offers) {
      const acceptedDate = offer.acceptedAt ? new Date(offer.acceptedAt) : null;
      if (acceptedDate) {
        const existing = firstAcceptedMap.get(offer.requisitionId);
        if (!existing || acceptedDate < existing) {
          firstAcceptedMap.set(offer.requisitionId, acceptedDate);
        }
      }
    }

    const fillTimes: number[] = [];
    const breakdown = requisitions.map((req) => {
      const firstAccepted = firstAcceptedMap.get(req.id);
      let daysToFill: number | null = null;

      if (firstAccepted && req.createdAt) {
        const createdDate = new Date(req.createdAt);
        daysToFill = Math.ceil(
          (firstAccepted.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        fillTimes.push(daysToFill);
      }

      return {
        requisitionId: req.id,
        title: req.title,
        status: req.status,
        createdAt: req.createdAt?.toISOString?.() ?? req.createdAt,
        firstAcceptedAt: firstAccepted?.toISOString() ?? null,
        daysToFill,
      };
    });

    // Calculate averages
    const averageDays = fillTimes.length > 0
      ? Math.round(fillTimes.reduce((a, b) => a + b, 0) / fillTimes.length)
      : 0;

    const sortedTimes = [...fillTimes].sort((a, b) => a - b);
    const medianDays = sortedTimes.length > 0
      ? sortedTimes.length % 2 === 0
        ? Math.round((sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2)
        : sortedTimes[Math.floor(sortedTimes.length / 2)]
      : 0;

    return {
      averageDays,
      medianDays,
      filledPositions: fillTimes.length,
      totalPositions: requisitions.length,
      breakdown,
    };
  }

  async getInterviewToHireRatio(orgId: string, managerId: string) {
    const reqIds = await this.getManagerRequisitionIds(orgId, managerId);

    if (reqIds.length === 0) {
      return {
        totalInterviews: 0,
        totalHires: 0,
        ratio: 0,
        breakdown: [],
      };
    }

    // Get total applications and hired counts per requisition
    const applications = await this.db
      .select({
        id: schema.applications.id,
        requisitionId: schema.applications.requisitionId,
        status: schema.applications.status,
      })
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.orgId, orgId),
          inArray(schema.applications.requisitionId, reqIds),
          eq(schema.applications.isActive, true),
        ),
      );

    // Get interview counts for these applications
    const appIds = applications.map((a) => a.id);
    let interviewCounts = new Map<string, number>();

    if (appIds.length > 0) {
      const interviews = await this.db
        .select({
          applicationId: schema.interviews.applicationId,
        })
        .from(schema.interviews)
        .where(
          and(
            eq(schema.interviews.orgId, orgId),
            inArray(schema.interviews.applicationId, appIds),
          ),
        );

      for (const interview of interviews) {
        interviewCounts.set(
          interview.applicationId,
          (interviewCounts.get(interview.applicationId) ?? 0) + 1,
        );
      }
    }

    // Aggregate by requisition
    const reqMap = new Map<string, { interviews: number; hires: number; applications: number }>();
    for (const app of applications) {
      if (!reqMap.has(app.requisitionId)) {
        reqMap.set(app.requisitionId, { interviews: 0, hires: 0, applications: 0 });
      }
      const data = reqMap.get(app.requisitionId)!;
      data.applications += 1;
      data.interviews += interviewCounts.get(app.id) ?? 0;
      if (app.status === 'hired') {
        data.hires += 1;
      }
    }

    // Get requisition titles
    const requisitions = await this.db
      .select({ id: schema.jobRequisitions.id, title: schema.jobRequisitions.title })
      .from(schema.jobRequisitions)
      .where(inArray(schema.jobRequisitions.id, reqIds));

    const titleMap = new Map<string, string>();
    for (const req of requisitions) {
      titleMap.set(req.id, req.title);
    }

    let totalInterviews = 0;
    let totalHires = 0;

    const breakdown = Array.from(reqMap.entries()).map(([reqId, data]) => {
      totalInterviews += data.interviews;
      totalHires += data.hires;

      return {
        requisitionId: reqId,
        title: titleMap.get(reqId) ?? 'Unknown',
        totalApplications: data.applications,
        totalInterviews: data.interviews,
        totalHires: data.hires,
        interviewToHireRatio: data.hires > 0
          ? Math.round((data.interviews / data.hires) * 100) / 100
          : data.interviews > 0 ? null : 0,
      };
    });

    return {
      totalInterviews,
      totalHires,
      ratio: totalHires > 0
        ? Math.round((totalInterviews / totalHires) * 100) / 100
        : totalInterviews > 0 ? null : 0,
      breakdown,
    };
  }

  async getUpcomingJoiners(orgId: string, managerId: string) {
    const reqIds = await this.getManagerRequisitionIds(orgId, managerId);

    if (reqIds.length === 0) {
      return { data: [], total: 0 };
    }

    const today = new Date().toISOString().split('T')[0];

    const joiners = await this.db
      .select({
        offerId: schema.offerLetters.id,
        applicationId: schema.offerLetters.applicationId,
        requisitionId: schema.offerLetters.requisitionId,
        designation: schema.offerLetters.designation,
        department: schema.offerLetters.department,
        location: schema.offerLetters.location,
        employmentType: schema.offerLetters.employmentType,
        salaryAmount: schema.offerLetters.salaryAmount,
        currency: schema.offerLetters.currency,
        joiningDate: schema.offerLetters.joiningDate,
        probationMonths: schema.offerLetters.probationMonths,
        acceptedAt: schema.offerLetters.acceptedAt,
        candidateFirstName: schema.candidates.firstName,
        candidateLastName: schema.candidates.lastName,
        candidateEmail: schema.candidates.email,
        candidatePhone: schema.candidates.phone,
        requisitionTitle: schema.jobRequisitions.title,
      })
      .from(schema.offerLetters)
      .innerJoin(schema.candidates, eq(schema.offerLetters.candidateId, schema.candidates.id))
      .innerJoin(schema.jobRequisitions, eq(schema.offerLetters.requisitionId, schema.jobRequisitions.id))
      .where(
        and(
          eq(schema.offerLetters.orgId, orgId),
          inArray(schema.offerLetters.requisitionId, reqIds),
          eq(schema.offerLetters.status, 'accepted'),
          gte(schema.offerLetters.joiningDate, today),
        ),
      )
      .orderBy(schema.offerLetters.joiningDate);

    return {
      data: joiners.map((j) => ({
        offerId: j.offerId,
        candidateName: `${j.candidateFirstName} ${j.candidateLastName ?? ''}`.trim(),
        candidateEmail: j.candidateEmail,
        candidatePhone: j.candidatePhone,
        requisitionId: j.requisitionId,
        requisitionTitle: j.requisitionTitle,
        designation: j.designation,
        department: j.department,
        location: j.location,
        employmentType: j.employmentType,
        salary: j.salaryAmount ? Number(j.salaryAmount) : null,
        currency: j.currency,
        joiningDate: j.joiningDate,
        probationMonths: j.probationMonths,
        acceptedAt: j.acceptedAt?.toISOString?.() ?? j.acceptedAt ?? null,
      })),
      total: joiners.length,
    };
  }
}
