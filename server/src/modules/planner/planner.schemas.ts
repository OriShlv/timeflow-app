import { z } from 'zod';

export const plannerIntentSchema = z.enum(['plan_day', 'split_task', 'next_action', 'freeform']);

export type PlannerIntent = z.infer<typeof plannerIntentSchema>;

export const plannerChatSchema = z.object({
  intent: plannerIntentSchema,
  message: z.string().max(2000).optional(),
  taskId: z.string().min(1).max(64).optional(),
  draftTaskTitle: z.string().min(1).max(200).optional(),
  idempotencyKey: z.string().min(1).max(128).optional(),
});

export const plannerLlmResponseSchema = z
  .object({
    message: z.string().min(1).max(4000),
    needsClarification: z.boolean().optional(),
    scheduleTaskIds: z.array(z.string().min(1)).optional(),
    subtasks: z
      .array(
        z.object({
          title: z.string().min(1).max(200),
          suggestedMinutes: z.number().int().min(5).max(240),
        }),
      )
      .optional(),
    recommendedTaskId: z.string().min(1).nullable().optional(),
    navigate: z
      .object({
        path: z.string().min(1).max(500),
        label: z.string().min(1).max(100),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.needsClarification === true &&
      data.subtasks !== undefined &&
      data.subtasks.length > 0
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'subtasks must be omitted when needsClarification is true',
        path: ['subtasks'],
      });
    }
  });

export type PlannerLlmResponse = z.infer<typeof plannerLlmResponseSchema>;
