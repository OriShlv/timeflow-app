import { z } from 'zod';

export const taskStatusSchema = z.enum(['PENDING', 'DONE', 'CANCELED']);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueAt: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: taskStatusSchema.optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  q: z.string().min(1).max(200).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),

  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),

  sort: z.enum(['createdAt', 'dueAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export function toDateOrUndefined(v?: string) {
  return v ? new Date(v) : undefined;
}
