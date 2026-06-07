import { redis } from '../../queue/redis';
import type { PlannerChatResult } from './planner.llm';

const TTL_SECONDS = 3600;
const KEY_PREFIX = 'planner:idem:';

function cacheKey(userId: string, idempotencyKey: string): string {
  return `${KEY_PREFIX}${userId}:${idempotencyKey}`;
}

export async function getPlannerIdempotentResult(
  userId: string,
  idempotencyKey: string,
): Promise<PlannerChatResult | null> {
  const raw = await redis.get(cacheKey(userId, idempotencyKey));
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw) as PlannerChatResult;
}

export async function setPlannerIdempotentResult(
  userId: string,
  idempotencyKey: string,
  result: PlannerChatResult,
): Promise<void> {
  await redis.set(cacheKey(userId, idempotencyKey), JSON.stringify(result), 'EX', TTL_SECONDS);
}

export async function deletePlannerIdempotentResult(
  userId: string,
  idempotencyKey: string,
): Promise<void> {
  await redis.del(cacheKey(userId, idempotencyKey));
}
