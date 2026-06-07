import type { PlannerChatMessage, PlannerIntent } from './plannerAgentTypes';

export const MAX_PLANNER_CONTEXT_MESSAGES = 40;
export const PLANNER_INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes

export const PLANNER_QUICK_INTENT_OPTIONS: { intent: PlannerIntent; label: string }[] = [
  { intent: 'plan_day', label: 'Plan my day' },
  { intent: 'split_task', label: 'Split a task' },
  { intent: 'next_action', label: 'What should I do next?' },
];

export function createPlannerCloseWarningMessage(messageId: string): PlannerChatMessage {
  return {
    id: messageId,
    role: 'assistant',
    content:
      "It's been 10 minutes since your last message. This chat will close soon to save your session. Would you like to keep it open?",
    actions: [{ type: 'confirm_close_chat' }],
    pending: false,
  };
}

export function createPlannerWelcomeMessage(messageId: string): PlannerChatMessage {
  return {
    id: messageId,
    role: 'assistant',
    content: "Hi! I'm your Timeflow planner. How can I help you today?",
    actions: [
      {
        type: 'quick_intents',
        options: PLANNER_QUICK_INTENT_OPTIONS,
      },
    ],
    pending: false,
  };
}

export function trimPlannerMessages(messages: PlannerChatMessage[]): PlannerChatMessage[] {
  if (messages.length <= MAX_PLANNER_CONTEXT_MESSAGES) {
    return messages;
  }
  return messages.slice(messages.length - MAX_PLANNER_CONTEXT_MESSAGES);
}

export function appendPlannerMessages(
  messages: PlannerChatMessage[],
  next: PlannerChatMessage | PlannerChatMessage[],
): PlannerChatMessage[] {
  const additions = Array.isArray(next) ? next : [next];
  return trimPlannerMessages([...messages, ...additions]);
}
