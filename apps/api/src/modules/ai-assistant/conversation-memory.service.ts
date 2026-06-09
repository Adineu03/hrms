import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS } from '../../infrastructure/cache/cache.module';
import type Redis from 'ioredis';
import { randomUUID } from 'crypto';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const MAX_MESSAGES = 50;
const TTL_SECONDS = 24 * 60 * 60; // 24 hours
const PENDING_TTL_SECONDS = 10 * 60; // 10 minutes — time a pending confirmation stays resumable

export interface PendingApproval {
  /** Serialized RunState from the Agents SDK (state.toString()). */
  state: string;
  /** The user message that triggered the pending action (for memory after resume). */
  userMessage: string;
}

/**
 * Conversation + pending-approval store. Redis-first, with an in-process
 * fallback so the assistant keeps working (including the Allow/Cancel resume
 * flow, which needs state to survive between two requests) when Redis is
 * briefly down or unavailable in local dev. The fallback is per-process and
 * best-effort — Redis remains the source of truth when reachable.
 */
@Injectable()
export class ConversationMemoryService {
  private readonly logger = new Logger(ConversationMemoryService.name);
  private readonly mem = new Map<string, { value: string; expiresAt: number }>();
  private warnedRedisDown = false;

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  // --- low-level get/set/del with Redis + in-memory fallback ---

  private memSet(key: string, value: string, ttlSeconds: number) {
    this.mem.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  private memGet(key: string): string | null {
    const entry = this.mem.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.mem.delete(key);
      return null;
    }
    return entry.value;
  }

  private noteRedisDown(err: unknown) {
    if (!this.warnedRedisDown) {
      this.warnedRedisDown = true;
      this.logger.warn('Redis unavailable — using in-memory fallback for chat state');
    }
  }

  private async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } catch (err) {
      this.noteRedisDown(err);
      this.memSet(key, value, ttlSeconds);
    }
  }

  private async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (err) {
      this.noteRedisDown(err);
      return this.memGet(key);
    }
  }

  private async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      this.noteRedisDown(err);
    }
    this.mem.delete(key);
  }

  // --- conversation history ---

  private key(orgId: string, userId: string, conversationId: string): string {
    return `chat:${orgId}:${userId}:${conversationId}`;
  }

  async getConversation(orgId: string, userId: string, conversationId: string): Promise<OpenAIMessage[]> {
    const data = await this.get(this.key(orgId, userId, conversationId));
    if (!data) return [];
    try {
      return JSON.parse(data) as OpenAIMessage[];
    } catch {
      return [];
    }
  }

  async saveConversation(
    orgId: string,
    userId: string,
    conversationId: string,
    messages: OpenAIMessage[],
  ): Promise<void> {
    const trimmed = messages.slice(-MAX_MESSAGES);
    await this.set(this.key(orgId, userId, conversationId), JSON.stringify(trimmed), TTL_SECONDS);
  }

  async clearConversation(orgId: string, userId: string, conversationId: string): Promise<void> {
    await this.del(this.key(orgId, userId, conversationId));
  }

  createConversationId(): string {
    return randomUUID();
  }

  // --- pending approval (run-state) for the Allow/Cancel resume flow ---

  private pendingKey(orgId: string, userId: string, conversationId: string): string {
    return `chat-pending:${orgId}:${userId}:${conversationId}`;
  }

  async savePendingApproval(
    orgId: string,
    userId: string,
    conversationId: string,
    pending: PendingApproval,
  ): Promise<void> {
    await this.set(this.pendingKey(orgId, userId, conversationId), JSON.stringify(pending), PENDING_TTL_SECONDS);
  }

  async getPendingApproval(
    orgId: string,
    userId: string,
    conversationId: string,
  ): Promise<PendingApproval | null> {
    const data = await this.get(this.pendingKey(orgId, userId, conversationId));
    if (!data) return null;
    try {
      return JSON.parse(data) as PendingApproval;
    } catch {
      return null;
    }
  }

  async clearPendingApproval(orgId: string, userId: string, conversationId: string): Promise<void> {
    await this.del(this.pendingKey(orgId, userId, conversationId));
  }
}
