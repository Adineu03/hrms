import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class LearningBudgetService {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getMyBudget(orgId: string, userId: string) {
    // Look for individual budget first, then fall back to department budget
    const [individualBudget] = await this.db
      .select()
      .from(schema.learningBudgets)
      .where(
        and(
          eq(schema.learningBudgets.orgId, orgId),
          eq(schema.learningBudgets.employeeId, userId),
          eq(schema.learningBudgets.isActive, true),
        ),
      )
      .orderBy(desc(schema.learningBudgets.createdAt))
      .limit(1);

    if (individualBudget) {
      return {
        data: individualBudget,
        type: 'individual',
      };
    }

    // Get employee's department
    const [profile] = await this.db
      .select({ departmentId: schema.employeeProfiles.departmentId })
      .from(schema.employeeProfiles)
      .where(
        and(
          eq(schema.employeeProfiles.orgId, orgId),
          eq(schema.employeeProfiles.userId, userId),
        ),
      )
      .limit(1);

    if (profile?.departmentId) {
      const [deptBudget] = await this.db
        .select()
        .from(schema.learningBudgets)
        .where(
          and(
            eq(schema.learningBudgets.orgId, orgId),
            eq(schema.learningBudgets.departmentId, profile.departmentId),
            eq(schema.learningBudgets.type, 'department'),
            eq(schema.learningBudgets.isActive, true),
          ),
        )
        .orderBy(desc(schema.learningBudgets.createdAt))
        .limit(1);

      if (deptBudget) {
        return {
          data: deptBudget,
          type: 'department',
        };
      }
    }

    return { data: null, type: null, message: 'No L&D budget allocated' };
  }

  async getSpendHistory(orgId: string, userId: string) {
    // Get individual budget with spend history
    const [budget] = await this.db
      .select()
      .from(schema.learningBudgets)
      .where(
        and(
          eq(schema.learningBudgets.orgId, orgId),
          eq(schema.learningBudgets.employeeId, userId),
          eq(schema.learningBudgets.isActive, true),
        ),
      )
      .orderBy(desc(schema.learningBudgets.createdAt))
      .limit(1);

    if (!budget) {
      return { data: [], meta: { total: 0 }, message: 'No individual budget found' };
    }

    const spendHistory = (budget.spendHistory as any[]) ?? [];

    return {
      data: spendHistory,
      meta: { total: spendHistory.length },
      budget: {
        totalBudget: budget.totalBudget,
        spentAmount: budget.spentAmount,
        remainingAmount: budget.remainingAmount,
      },
    };
  }

  async requestCourseApproval(orgId: string, userId: string, data: {
    courseName: string;
    provider?: string;
    cost: number;
    currency?: string;
    url?: string;
    justification?: string;
  }) {
    // Find the user's budget
    const [budget] = await this.db
      .select()
      .from(schema.learningBudgets)
      .where(
        and(
          eq(schema.learningBudgets.orgId, orgId),
          eq(schema.learningBudgets.employeeId, userId),
          eq(schema.learningBudgets.isActive, true),
        ),
      )
      .orderBy(desc(schema.learningBudgets.createdAt))
      .limit(1);

    if (!budget) {
      // If no individual budget, check department budget
      const [profile] = await this.db
        .select({ departmentId: schema.employeeProfiles.departmentId })
        .from(schema.employeeProfiles)
        .where(
          and(
            eq(schema.employeeProfiles.orgId, orgId),
            eq(schema.employeeProfiles.userId, userId),
          ),
        )
        .limit(1);

      if (profile?.departmentId) {
        const [deptBudget] = await this.db
          .select()
          .from(schema.learningBudgets)
          .where(
            and(
              eq(schema.learningBudgets.orgId, orgId),
              eq(schema.learningBudgets.departmentId, profile.departmentId),
              eq(schema.learningBudgets.type, 'department'),
              eq(schema.learningBudgets.isActive, true),
            ),
          )
          .orderBy(desc(schema.learningBudgets.createdAt))
          .limit(1);

        if (deptBudget) {
          // Add request to department budget's spend history
          const spendHistory = [...((deptBudget.spendHistory as any[]) ?? [])];
          spendHistory.push({
            employeeId: userId,
            courseName: data.courseName,
            provider: data.provider ?? null,
            cost: data.cost,
            currency: data.currency ?? 'INR',
            url: data.url ?? null,
            justification: data.justification ?? null,
            status: 'pending_approval',
            requestedAt: new Date().toISOString(),
          });

          await this.db
            .update(schema.learningBudgets)
            .set({ spendHistory, updatedAt: new Date() })
            .where(eq(schema.learningBudgets.id, deptBudget.id));

          return {
            success: true,
            message: 'Approval request submitted against department budget',
            budgetType: 'department',
          };
        }
      }

      return { success: false, message: 'No budget available for approval request' };
    }

    // Add to individual budget's spend history
    const spendHistory = [...((budget.spendHistory as any[]) ?? [])];
    spendHistory.push({
      courseName: data.courseName,
      provider: data.provider ?? null,
      cost: data.cost,
      currency: data.currency ?? 'INR',
      url: data.url ?? null,
      justification: data.justification ?? null,
      status: 'pending_approval',
      requestedAt: new Date().toISOString(),
    });

    await this.db
      .update(schema.learningBudgets)
      .set({ spendHistory, updatedAt: new Date() })
      .where(eq(schema.learningBudgets.id, budget.id));

    return {
      success: true,
      message: 'Approval request submitted',
      budgetType: 'individual',
      remainingBudget: budget.remainingAmount,
    };
  }
}
