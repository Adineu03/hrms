import { inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../infrastructure/database/schema';

/**
 * Resolve user ids → "First Last" display names in one query.
 * Standard helper for list endpoints whose rows carry a bare userId/actorId —
 * join-by-map instead of N+1 or hand-rolled joins per service.
 */
export async function buildUserNameMap(
  db: PostgresJsDatabase<typeof schema>,
  userIds: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return new Map();

  const rows = await db
    .select({
      id: schema.users.id,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
    })
    .from(schema.users)
    .where(inArray(schema.users.id, ids));

  return new Map(rows.map((r) => [r.id, `${r.firstName} ${r.lastName ?? ''}`.trim()]));
}
