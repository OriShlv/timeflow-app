export type PlannerIntent = 'plan_day' | 'split_task' | 'next_action' | 'freeform';

export type PlannerScheduleBlock = {
  startTime: string;
  endTime: string;
  label: string;
  taskId: string | null;
};

export type PlannerSubTaskProposal = {
  title: string;
  suggestedMinutes: number;
  dueAt: string | null;
};

export type PlannerNavigateTarget = {
  path: string;
  label: string;
};

export type PlannerCreateSubtasksAction = {
  type: 'create_subtasks';
  parentTaskId: string;
  parentTaskTitle: string;
  subtasks: PlannerSubTaskProposal[];
};

export type PlannerScheduleBlocksAction = {
  type: 'schedule_blocks';
  blocks: PlannerScheduleBlock[];
};

export type PlannerNavigateAction = {
  type: 'navigate';
  navigate: PlannerNavigateTarget;
};

export type PlannerPickTaskOption = {
  taskId: string;
  title: string;
};

export type PlannerPickTaskAction = {
  type: 'pick_task';
  tasks: PlannerPickTaskOption[];
};

export type PlannerQuickIntentOption = {
  intent: PlannerIntent;
  label: string;
};

export type PlannerQuickIntentsAction = {
  type: 'quick_intents';
  options: PlannerQuickIntentOption[];
};

export type PlannerConfirmCloseChatAction = {
  type: 'confirm_close_chat';
};

export type PlannerProposeDraftSubtasksAction = {
  type: 'propose_draft_subtasks';
  parentTaskTitle: string;
  subtasks: PlannerSubTaskProposal[];
};

export type PlannerAgentAction =
  | PlannerCreateSubtasksAction
  | PlannerScheduleBlocksAction
  | PlannerNavigateAction
  | PlannerPickTaskAction
  | PlannerQuickIntentsAction
  | PlannerConfirmCloseChatAction
  | PlannerProposeDraftSubtasksAction;

export type PlannerChatRequest = {
  intent: PlannerIntent;
  message: string | undefined;
  taskId: string | undefined;
  draftTaskTitle: string | undefined;
  idempotencyKey: string | undefined;
};

export type PlannerChatResponse = {
  ok: boolean;
  message: string;
  actions: PlannerAgentAction[];
  needsClarification: boolean;
};

export type PlannerMessageRole = 'user' | 'assistant';

export type PlannerChatMessage = {
  id: string;
  role: PlannerMessageRole;
  content: string;
  actions: PlannerAgentAction[];
  pending: boolean;
};
