import { apiRequest } from './apiClient';
import type { PlannerChatRequest, PlannerChatResponse } from './plannerAgentTypes';

export async function sendPlannerMessage(body: PlannerChatRequest): Promise<PlannerChatResponse> {
  const payload: Record<string, string> = { intent: body.intent };
  if (body.message !== undefined) {
    payload.message = body.message;
  }
  if (body.taskId !== undefined) {
    payload.taskId = body.taskId;
  }
  if (body.draftTaskTitle !== undefined) {
    payload.draftTaskTitle = body.draftTaskTitle;
  }
  if (body.idempotencyKey !== undefined) {
    payload.idempotencyKey = body.idempotencyKey;
  }

  const response = await apiRequest<PlannerChatResponse>({
    method: 'POST',
    path: '/planner/chat',
    body: payload,
    includeAuth: true,
  });
  return response;
}
