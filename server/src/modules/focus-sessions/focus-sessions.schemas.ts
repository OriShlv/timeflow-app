import { z } from 'zod';

export const focusSessionStatusSchema = z.enum(['RUNNING', 'COMPLETED', 'CANCELED']);

export const startFocusSessionSchema = z.object({
  taskId: z.string().min(1).optional(),
  plannedMinutes: z.number().int().min(1).max(480).optional(),
  source: z.string().min(1).max(32).optional(),
  notes: z.string().max(1000).optional(),
});

export const stopFocusSessionSchema = z.object({
  endedAt: z.string().datetime().optional(),
});

export const cancelFocusSessionSchema = z.object({
  endedAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const listFocusSessionsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  taskId: z.string().min(1).optional(),
  status: focusSessionStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const dailySummaryQuerySchema = z.object({
  day: z.string().datetime().optional(),
});

export function toDateOrUndefined(value?: string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }
  return new Date(value);
}
