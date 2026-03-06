import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../../../../infrastructure/database/database.module';
import * as schema from '../../../../infrastructure/database/schema';

@Injectable()
export class TimerService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // ── Get Active Timers ───────────────────────────────────────────────────
  async getActiveTimers(orgId: string, employeeId: string) {
    const timers = await this.db
      .select({
        timer: schema.timerSessions,
        projectName: schema.projects.name,
        projectCode: schema.projects.code,
        projectColor: schema.projects.color,
        categoryName: schema.taskCategories.name,
      })
      .from(schema.timerSessions)
      .leftJoin(schema.projects, eq(schema.timerSessions.projectId, schema.projects.id))
      .leftJoin(schema.taskCategories, eq(schema.timerSessions.taskCategoryId, schema.taskCategories.id))
      .where(
        and(
          eq(schema.timerSessions.orgId, orgId),
          eq(schema.timerSessions.employeeId, employeeId),
          sql`(${schema.timerSessions.isRunning} = true OR ${schema.timerSessions.isPaused} = true)`,
        ),
      )
      .orderBy(desc(schema.timerSessions.startTime));

    const now = new Date();

    return {
      timers: timers.map((t) => this.toTimerWithDetailsDto(t, now)),
      count: timers.length,
    };
  }

  // ── Start Timer ─────────────────────────────────────────────────────────
  async startTimer(orgId: string, employeeId: string, data: Record<string, any>) {
    const { projectId, taskCategoryId, description, isBillable } = data;

    // Check if there's already a running timer
    const [runningTimer] = await this.db
      .select()
      .from(schema.timerSessions)
      .where(
        and(
          eq(schema.timerSessions.orgId, orgId),
          eq(schema.timerSessions.employeeId, employeeId),
          eq(schema.timerSessions.isRunning, true),
        ),
      )
      .limit(1);

    if (runningTimer) {
      throw new BadRequestException('A timer is already running. Stop or pause it before starting a new one.');
    }

    // Validate project if provided
    if (projectId) {
      const [project] = await this.db
        .select()
        .from(schema.projects)
        .where(and(eq(schema.projects.id, projectId), eq(schema.projects.orgId, orgId)))
        .limit(1);

      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    // Validate task category if provided
    if (taskCategoryId) {
      const [category] = await this.db
        .select()
        .from(schema.taskCategories)
        .where(and(eq(schema.taskCategories.id, taskCategoryId), eq(schema.taskCategories.orgId, orgId)))
        .limit(1);

      if (!category) {
        throw new NotFoundException('Task category not found');
      }
    }

    const now = new Date();

    const [timer] = await this.db
      .insert(schema.timerSessions)
      .values({
        orgId,
        employeeId,
        projectId: projectId || null,
        taskCategoryId: taskCategoryId || null,
        description: description || null,
        startTime: now,
        isRunning: true,
        isPaused: false,
        isBillable: isBillable || false,
        totalPausedSeconds: '0',
      })
      .returning();

    return this.toTimerDto(timer, now);
  }

  // ── Stop Timer ──────────────────────────────────────────────────────────
  async stopTimer(orgId: string, employeeId: string, timerId: string) {
    const [timer] = await this.db
      .select()
      .from(schema.timerSessions)
      .where(
        and(
          eq(schema.timerSessions.id, timerId),
          eq(schema.timerSessions.orgId, orgId),
          eq(schema.timerSessions.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!timer) {
      throw new NotFoundException('Timer session not found');
    }

    if (!timer.isRunning && !timer.isPaused) {
      throw new BadRequestException('Timer is already stopped');
    }

    const now = new Date();
    let totalPausedSeconds = parseInt(timer.totalPausedSeconds || '0', 10);

    // If paused, add remaining pause time
    if (timer.isPaused && timer.pausedAt) {
      const additionalPauseSeconds = Math.round(
        (now.getTime() - timer.pausedAt.getTime()) / 1000,
      );
      totalPausedSeconds += additionalPauseSeconds;
    }

    const [updated] = await this.db
      .update(schema.timerSessions)
      .set({
        endTime: now,
        isRunning: false,
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: String(totalPausedSeconds),
        updatedAt: now,
      })
      .where(eq(schema.timerSessions.id, timerId))
      .returning();

    return this.toTimerDto(updated, now);
  }

  // ── Pause Timer ─────────────────────────────────────────────────────────
  async pauseTimer(orgId: string, employeeId: string, timerId: string) {
    const [timer] = await this.db
      .select()
      .from(schema.timerSessions)
      .where(
        and(
          eq(schema.timerSessions.id, timerId),
          eq(schema.timerSessions.orgId, orgId),
          eq(schema.timerSessions.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!timer) {
      throw new NotFoundException('Timer session not found');
    }

    if (!timer.isRunning) {
      throw new BadRequestException('Timer is not running');
    }

    if (timer.isPaused) {
      throw new BadRequestException('Timer is already paused');
    }

    const now = new Date();

    const [updated] = await this.db
      .update(schema.timerSessions)
      .set({
        pausedAt: now,
        isPaused: true,
        isRunning: false,
        updatedAt: now,
      })
      .where(eq(schema.timerSessions.id, timerId))
      .returning();

    return this.toTimerDto(updated, now);
  }

  // ── Resume Timer ────────────────────────────────────────────────────────
  async resumeTimer(orgId: string, employeeId: string, timerId: string) {
    const [timer] = await this.db
      .select()
      .from(schema.timerSessions)
      .where(
        and(
          eq(schema.timerSessions.id, timerId),
          eq(schema.timerSessions.orgId, orgId),
          eq(schema.timerSessions.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!timer) {
      throw new NotFoundException('Timer session not found');
    }

    if (!timer.isPaused) {
      throw new BadRequestException('Timer is not paused');
    }

    if (timer.endTime) {
      throw new BadRequestException('Cannot resume a stopped timer');
    }

    const now = new Date();

    // Calculate paused duration and add to total
    let totalPausedSeconds = parseInt(timer.totalPausedSeconds || '0', 10);
    if (timer.pausedAt) {
      const pausedDurationSeconds = Math.round(
        (now.getTime() - timer.pausedAt.getTime()) / 1000,
      );
      totalPausedSeconds += pausedDurationSeconds;
    }

    const [updated] = await this.db
      .update(schema.timerSessions)
      .set({
        pausedAt: null,
        isPaused: false,
        isRunning: true,
        totalPausedSeconds: String(totalPausedSeconds),
        updatedAt: now,
      })
      .where(eq(schema.timerSessions.id, timerId))
      .returning();

    return this.toTimerDto(updated, now);
  }

  // ── Timer History ───────────────────────────────────────────────────────
  async getTimerHistory(
    orgId: string,
    employeeId: string,
    filters: { from?: string; to?: string; page?: string; limit?: string },
  ) {
    const page = Math.max(1, parseInt(filters.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions = [
      eq(schema.timerSessions.orgId, orgId),
      eq(schema.timerSessions.employeeId, employeeId),
      eq(schema.timerSessions.isRunning, false),
      eq(schema.timerSessions.isPaused, false),
    ];

    if (filters.from) {
      conditions.push(gte(schema.timerSessions.startTime, new Date(filters.from)));
    }
    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(schema.timerSessions.startTime, toDate));
    }

    const whereClause = and(...conditions)!;
    const now = new Date();

    const timers = await this.db
      .select({
        timer: schema.timerSessions,
        projectName: schema.projects.name,
        projectCode: schema.projects.code,
        projectColor: schema.projects.color,
        categoryName: schema.taskCategories.name,
      })
      .from(schema.timerSessions)
      .leftJoin(schema.projects, eq(schema.timerSessions.projectId, schema.projects.id))
      .leftJoin(schema.taskCategories, eq(schema.timerSessions.taskCategoryId, schema.taskCategories.id))
      .where(whereClause)
      .orderBy(desc(schema.timerSessions.startTime))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ total: sql<string>`count(*)` })
      .from(schema.timerSessions)
      .where(whereClause);

    const total = parseInt(countResult?.total || '0', 10);

    return {
      sessions: timers.map((t) => this.toTimerWithDetailsDto(t, now)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Convert Timer to Timesheet Entry ────────────────────────────────────
  async convertToEntry(orgId: string, employeeId: string, timerId: string, data: Record<string, any>) {
    const [timer] = await this.db
      .select()
      .from(schema.timerSessions)
      .where(
        and(
          eq(schema.timerSessions.id, timerId),
          eq(schema.timerSessions.orgId, orgId),
          eq(schema.timerSessions.employeeId, employeeId),
        ),
      )
      .limit(1);

    if (!timer) {
      throw new NotFoundException('Timer session not found');
    }

    if (timer.isRunning || timer.isPaused) {
      throw new BadRequestException('Stop the timer before converting to a timesheet entry');
    }

    if (timer.linkedEntryId) {
      throw new BadRequestException('Timer has already been converted to a timesheet entry');
    }

    if (!timer.endTime) {
      throw new BadRequestException('Timer has no end time');
    }

    // Calculate duration in hours
    const totalSeconds = Math.round(
      (timer.endTime.getTime() - timer.startTime.getTime()) / 1000,
    );
    const totalPausedSeconds = parseInt(timer.totalPausedSeconds || '0', 10);
    const activeSeconds = Math.max(0, totalSeconds - totalPausedSeconds);
    const hours = Math.round((activeSeconds / 3600) * 100) / 100;

    const entryDate = timer.startTime.toISOString().slice(0, 10);
    const startTimeStr = timer.startTime.toISOString().slice(11, 16); // HH:MM
    const endTimeStr = timer.endTime.toISOString().slice(11, 16);

    // Create the timesheet entry
    const [entry] = await this.db
      .insert(schema.timesheetEntries)
      .values({
        orgId,
        employeeId,
        date: entryDate,
        projectId: data.projectId || timer.projectId || null,
        taskCategoryId: data.taskCategoryId || timer.taskCategoryId || null,
        startTime: startTimeStr,
        endTime: endTimeStr,
        hours: String(hours),
        description: data.description || timer.description || null,
        isBillable: data.isBillable !== undefined ? data.isBillable : timer.isBillable,
        tags: data.tags || [],
        activityType: data.activityType || 'timer',
        status: 'draft',
      })
      .returning();

    // Link the timer to the entry
    const now = new Date();
    await this.db
      .update(schema.timerSessions)
      .set({
        linkedEntryId: entry.id,
        updatedAt: now,
      })
      .where(eq(schema.timerSessions.id, timerId));

    return {
      timerId: timer.id,
      entry: {
        id: entry.id,
        date: entry.date,
        projectId: entry.projectId,
        taskCategoryId: entry.taskCategoryId,
        startTime: entry.startTime,
        endTime: entry.endTime,
        hours: Number(entry.hours),
        description: entry.description,
        isBillable: entry.isBillable,
        status: entry.status,
        createdAt: entry.createdAt.toISOString(),
      },
    };
  }

  // ── Daily Summary ───────────────────────────────────────────────────────
  async getDailySummary(orgId: string, employeeId: string) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todayStart = new Date(todayStr);
    const todayEnd = new Date(todayStr);
    todayEnd.setHours(23, 59, 59, 999);

    // Get all timer sessions started today
    const sessions = await this.db
      .select({
        timer: schema.timerSessions,
        projectName: schema.projects.name,
        projectCode: schema.projects.code,
      })
      .from(schema.timerSessions)
      .leftJoin(schema.projects, eq(schema.timerSessions.projectId, schema.projects.id))
      .where(
        and(
          eq(schema.timerSessions.orgId, orgId),
          eq(schema.timerSessions.employeeId, employeeId),
          gte(schema.timerSessions.startTime, todayStart),
          lte(schema.timerSessions.startTime, todayEnd),
        ),
      )
      .orderBy(asc(schema.timerSessions.startTime));

    let totalTrackedSeconds = 0;
    let totalPausedSeconds = 0;
    let activeTimerSeconds = 0;

    for (const s of sessions) {
      const timer = s.timer;
      const endTime = timer.endTime || now;
      const totalSeconds = Math.round((endTime.getTime() - timer.startTime.getTime()) / 1000);
      const paused = parseInt(timer.totalPausedSeconds || '0', 10);

      // Add current pause duration if currently paused
      let currentPauseDuration = 0;
      if (timer.isPaused && timer.pausedAt) {
        currentPauseDuration = Math.round((now.getTime() - timer.pausedAt.getTime()) / 1000);
      }

      const activeSeconds = Math.max(0, totalSeconds - paused - currentPauseDuration);
      totalTrackedSeconds += activeSeconds;
      totalPausedSeconds += paused + currentPauseDuration;

      if (timer.isRunning) {
        activeTimerSeconds = activeSeconds;
      }
    }

    const totalTrackedHours = Math.round((totalTrackedSeconds / 3600) * 100) / 100;

    return {
      date: todayStr,
      totalTrackedSeconds,
      totalTrackedHours,
      totalPausedSeconds,
      sessionsCount: sessions.length,
      hasActiveTimer: sessions.some((s) => s.timer.isRunning),
      activeTimerSeconds,
      sessions: sessions.map((s) => {
        const timer = s.timer;
        const endTime = timer.endTime || now;
        const totalSec = Math.round((endTime.getTime() - timer.startTime.getTime()) / 1000);
        const pausedSec = parseInt(timer.totalPausedSeconds || '0', 10);
        let currentPause = 0;
        if (timer.isPaused && timer.pausedAt) {
          currentPause = Math.round((now.getTime() - timer.pausedAt.getTime()) / 1000);
        }
        const activeSec = Math.max(0, totalSec - pausedSec - currentPause);

        return {
          id: timer.id,
          projectName: s.projectName || 'No Project',
          projectCode: s.projectCode || '',
          description: timer.description,
          startTime: timer.startTime.toISOString(),
          endTime: timer.endTime?.toISOString() || null,
          isRunning: timer.isRunning,
          isPaused: timer.isPaused,
          activeSeconds: activeSec,
          activeHours: Math.round((activeSec / 3600) * 100) / 100,
          isConverted: !!timer.linkedEntryId,
        };
      }),
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private toTimerDto(row: typeof schema.timerSessions.$inferSelect, now: Date) {
    const endTime = row.endTime || now;
    const totalSeconds = Math.round((endTime.getTime() - row.startTime.getTime()) / 1000);
    const pausedSeconds = parseInt(row.totalPausedSeconds || '0', 10);

    let currentPauseDuration = 0;
    if (row.isPaused && row.pausedAt) {
      currentPauseDuration = Math.round((now.getTime() - row.pausedAt.getTime()) / 1000);
    }

    const activeSeconds = Math.max(0, totalSeconds - pausedSeconds - currentPauseDuration);

    return {
      id: row.id,
      orgId: row.orgId,
      employeeId: row.employeeId,
      projectId: row.projectId,
      taskCategoryId: row.taskCategoryId,
      description: row.description,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime?.toISOString() || null,
      pausedAt: row.pausedAt?.toISOString() || null,
      totalPausedSeconds: pausedSeconds + currentPauseDuration,
      isRunning: row.isRunning,
      isPaused: row.isPaused,
      isBillable: row.isBillable,
      linkedEntryId: row.linkedEntryId,
      activeSeconds,
      activeHours: Math.round((activeSeconds / 3600) * 100) / 100,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toTimerWithDetailsDto(
    row: {
      timer: typeof schema.timerSessions.$inferSelect;
      projectName: string | null;
      projectCode: string | null;
      projectColor: string | null;
      categoryName: string | null;
    },
    now: Date,
  ) {
    const base = this.toTimerDto(row.timer, now);
    return {
      ...base,
      projectName: row.projectName,
      projectCode: row.projectCode,
      projectColor: row.projectColor,
      categoryName: row.categoryName,
    };
  }
}
