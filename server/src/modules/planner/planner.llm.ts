import { env } from '../../config/env';
import { HttpError } from '../../app/errors/http-error';
import { llmClient } from '../../llm/client';
import {
  buildPlannerContext,
  DRAFT_TASK_ID,
  formatTaskListForPrompt,
  type PlannerContext,
  type PlannerTaskRow,
} from './planner.context';
import {
  plannerLlmResponseSchema,
  type PlannerIntent,
  type PlannerLlmResponse,
} from './planner.schemas';

type PlannerScheduleBlock = {
  startTime: string;
  endTime: string;
  label: string;
  taskId: string | null;
};

type PlannerSubTaskProposal = {
  title: string;
  suggestedMinutes: number;
  dueAt: string | null;
};

type PlannerAgentAction =
  | {
      type: 'create_subtasks';
      parentTaskId: string;
      parentTaskTitle: string;
      subtasks: PlannerSubTaskProposal[];
    }
  | {
      type: 'propose_draft_subtasks';
      parentTaskTitle: string;
      subtasks: PlannerSubTaskProposal[];
    }
  | { type: 'schedule_blocks'; blocks: PlannerScheduleBlock[] }
  | { type: 'navigate'; navigate: { path: string; label: string } };

export type PlannerChatResult = {
  message: string;
  actions: PlannerAgentAction[];
  needsClarification: boolean;
};

const BLOCK_MINUTES = 45;
const BREAK_MINUTES = 15;

const WEAK_LLM_MESSAGE_MARKERS = [
  'friendly plain-text',
  'task-id-from-context',
  'button label',
  'string',
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isWeakLlmMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (normalized.length < 12) {
    return true;
  }
  return WEAK_LLM_MESSAGE_MARKERS.some((marker) => normalized.includes(marker));
}

function taskHasEnoughSplitContext(task: PlannerTaskRow): boolean {
  const description = task.description?.trim() ?? '';
  if (description.length >= 20) {
    return true;
  }
  const title = task.title.trim();
  const wordCount = title.split(/\s+/).filter((word) => word.length > 0).length;
  return wordCount >= 5 && title.length >= 35;
}

function enforceSplitClarification(
  context: PlannerContext,
  message: string | undefined,
  llm: PlannerLlmResponse,
): PlannerLlmResponse {
  if (context.targetTask === null) {
    return llm;
  }

  const userAnswered = message !== undefined && message.trim().length > 0;
  if (userAnswered) {
    return llm;
  }

  if (llm.needsClarification === true) {
    return { ...llm, subtasks: undefined };
  }

  if (taskHasEnoughSplitContext(context.targetTask)) {
    return llm;
  }

  const title = context.targetTask.title.trim();
  return {
    message: `I'd love to help you break down "${title}" into clear, useful steps! To suggest the right subtasks, could you share:\n1. What is the main goal or deliverable?\n2. Who is it for, and are there any deadlines or constraints?\n3. What materials or context do you already have?\n\nIf this is prep for a test, interview, or presentation, tell me the subject, scope, and format — and I can also help you think through study sources if you'd like.`,
    needsClarification: true,
    subtasks: undefined,
  };
}

function resolvePlanDayTasks(context: PlannerContext, llm: PlannerLlmResponse): PlannerTaskRow[] {
  const fromLlm = (llm.scheduleTaskIds ?? [])
    .map((id) => taskById(context, id))
    .filter((task): task is PlannerTaskRow => task !== undefined);
  if (fromLlm.length > 0) {
    return fromLlm.slice(0, 4);
  }
  return context.pendingTasks.slice(0, 4);
}

function resolveNextActionTask(
  context: PlannerContext,
  llm: PlannerLlmResponse,
): PlannerTaskRow | null {
  if (llm.recommendedTaskId !== undefined && llm.recommendedTaskId !== null) {
    const fromLlm = taskById(context, llm.recommendedTaskId);
    if (fromLlm !== undefined) {
      return fromLlm;
    }
  }
  if (context.overdueTasks.length > 0) {
    return context.overdueTasks[0];
  }
  if (context.pendingTasks.length > 0) {
    return context.pendingTasks[0];
  }
  return null;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function buildUserPrompt(
  intent: PlannerIntent,
  context: PlannerContext,
  message: string | undefined,
): string {
  const lines = [
    `Intent: ${intent}`,
    `Current time: ${context.now.toISOString()}`,
    `Pending task count: ${context.pendingCount}`,
    '',
    'Pending tasks (use exact ids below):',
    formatTaskListForPrompt(context.pendingTasks),
    '',
    'Overdue tasks:',
    formatTaskListForPrompt(context.overdueTasks),
  ];

  if (context.targetTask !== null) {
    const description = context.targetTask.description?.trim() ?? '';
    lines.push(
      '',
      'Target task for split_task:',
      `- id=${context.targetTask.id} | title="${context.targetTask.title}" | due=${context.targetTask.dueAt?.toISOString() ?? 'no due date'}`,
      `- description=${description.length > 0 ? `"${description}"` : '(empty)'}`,
    );
  }

  if (
    (intent === 'freeform' || intent === 'split_task') &&
    message !== undefined &&
    message.trim().length > 0
  ) {
    lines.push('', `User message: ${message.trim()}`);
  }

  return lines.join('\n');
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch !== null) {
    return fenceMatch[1].trim();
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Ollama response did not contain a JSON object');
  }
  return trimmed.slice(start, end + 1);
}

async function callPlannerLlm(
  intent: PlannerIntent,
  context: PlannerContext,
  message: string | undefined,
): Promise<PlannerLlmResponse> {
  const userPrompt = buildUserPrompt(intent, context, message);

  let raw: string;
  try {
    raw = await llmClient.chat({
      model: env.OLLAMA_MODEL,
      formatJson: true,
      messages: [
        { role: 'system', content: llmClient.plannerSystemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new HttpError(
      503,
      'PlannerLlmUnavailable',
      `Planner LLM is unavailable (Ollama at ${env.OLLAMA_HOST}, model ${env.OLLAMA_MODEL}): ${detail}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new HttpError(
      502,
      'PlannerLlmInvalidJson',
      `Planner LLM returned invalid JSON: ${detail}. Raw: ${raw.slice(0, 200)}`,
    );
  }

  const validated = plannerLlmResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new HttpError(
      502,
      'PlannerLlmInvalidShape',
      `Planner LLM response failed validation: ${validated.error.message}`,
    );
  }

  return validated.data;
}

function taskById(context: PlannerContext, taskId: string): PlannerTaskRow | undefined {
  const fromPending = context.pendingTasks.find((task) => task.id === taskId);
  if (fromPending !== undefined) {
    return fromPending;
  }
  return context.overdueTasks.find((task) => task.id === taskId);
}

function buildDayBlocks(tasks: PlannerTaskRow[], now: Date): PlannerScheduleBlock[] {
  const workStart = new Date(now);
  workStart.setMinutes(Math.ceil(workStart.getMinutes() / 15) * 15, 0, 0);
  if (workStart.getHours() >= 18) {
    workStart.setDate(workStart.getDate() + 1);
    workStart.setHours(9, 0, 0, 0);
  }

  const blocks: PlannerScheduleBlock[] = [];
  let cursor = workStart;

  for (const task of tasks.slice(0, 4)) {
    const end = addMinutes(cursor, BLOCK_MINUTES);
    blocks.push({
      startTime: cursor.toISOString(),
      endTime: end.toISOString(),
      label: task.title,
      taskId: task.id,
    });
    cursor = addMinutes(end, BREAK_MINUTES);
  }

  return blocks;
}

function mapLlmToActions(
  intent: PlannerIntent,
  context: PlannerContext,
  llm: PlannerLlmResponse,
): PlannerAgentAction[] {
  if (intent === 'plan_day') {
    if (context.pendingCount === 0) {
      return [
        {
          type: 'navigate',
          navigate: { path: '/tasks?status=PENDING', label: 'Open pending tasks' },
        },
      ];
    }
    const tasks = resolvePlanDayTasks(context, llm);
    if (tasks.length === 0) {
      return [];
    }
    return [{ type: 'schedule_blocks', blocks: buildDayBlocks(tasks, context.now) }];
  }

  if (intent === 'split_task') {
    if (context.targetTask === null) {
      return [
        {
          type: 'navigate',
          navigate: {
            path: '/tasks?status=PENDING&sort=dueAt&order=asc',
            label: 'Browse pending tasks',
          },
        },
      ];
    }
    const dueAt = context.targetTask.dueAt !== null ? context.targetTask.dueAt.toISOString() : null;
    if (
      llm.needsClarification === true ||
      llm.subtasks === undefined ||
      llm.subtasks.length === 0
    ) {
      return [];
    }
    const subtasks = llm.subtasks.map((item) => ({
      title: item.title,
      suggestedMinutes: item.suggestedMinutes,
      dueAt,
    }));
    if (context.targetTask.id === DRAFT_TASK_ID) {
      return [
        {
          type: 'propose_draft_subtasks',
          parentTaskTitle: context.targetTask.title,
          subtasks,
        },
      ];
    }
    return [
      {
        type: 'create_subtasks',
        parentTaskId: context.targetTask.id,
        parentTaskTitle: context.targetTask.title,
        subtasks,
      },
    ];
  }

  if (intent === 'next_action') {
    if (context.pendingCount === 0) {
      return [
        {
          type: 'navigate',
          navigate: { path: '/tasks?status=PENDING', label: 'Add or review tasks' },
        },
      ];
    }
    const task = resolveNextActionTask(context, llm);
    if (task === null) {
      return [];
    }
    return [
      {
        type: 'navigate',
        navigate: {
          path: `/tasks?status=PENDING&q=${encodeURIComponent(task.title)}`,
          label: `Open "${task.title}"`,
        },
      },
    ];
  }

  if (llm.navigate !== undefined) {
    return [{ type: 'navigate', navigate: llm.navigate }];
  }
  return [];
}

function composeDisplayMessage(
  intent: PlannerIntent,
  context: PlannerContext,
  llmMessage: string,
  actions: PlannerAgentAction[],
): string {
  if (!isWeakLlmMessage(llmMessage)) {
    return llmMessage;
  }

  const scheduleAction = actions.find(
    (action): action is { type: 'schedule_blocks'; blocks: PlannerScheduleBlock[] } =>
      action.type === 'schedule_blocks',
  );
  if (scheduleAction !== undefined) {
    const summary = scheduleAction.blocks
      .map(
        (block) =>
          `${formatTime(new Date(block.startTime))}–${formatTime(new Date(block.endTime))}: ${block.label}`,
      )
      .join('\n');
    return `Here is a suggested schedule with ${scheduleAction.blocks.length} focus blocks:\n\n${summary}\n\nTap Start focus on a block when you are ready.`;
  }

  const subtaskAction = actions.find(
    (
      action,
    ): action is {
      type: 'create_subtasks';
      parentTaskId: string;
      parentTaskTitle: string;
      subtasks: PlannerSubTaskProposal[];
    } => action.type === 'create_subtasks',
  );
  if (subtaskAction !== undefined) {
    const lines = subtaskAction.subtasks
      .map((item) => `• ${item.title} (~${item.suggestedMinutes} min)`)
      .join('\n');
    return `I suggest splitting "${subtaskAction.parentTaskTitle}" into ${subtaskAction.subtasks.length} steps:\n\n${lines}\n\nConfirm below to create them.`;
  }

  const draftSubtaskAction = actions.find(
    (
      action,
    ): action is {
      type: 'propose_draft_subtasks';
      parentTaskTitle: string;
      subtasks: PlannerSubTaskProposal[];
    } => action.type === 'propose_draft_subtasks',
  );
  if (draftSubtaskAction !== undefined) {
    const lines = draftSubtaskAction.subtasks
      .map((item) => `• ${item.title} (~${item.suggestedMinutes} min)`)
      .join('\n');
    return `I suggest splitting "${draftSubtaskAction.parentTaskTitle}" into ${draftSubtaskAction.subtasks.length} steps:\n\n${lines}\n\nWould you like to add "${draftSubtaskAction.parentTaskTitle}" to your task list and create these subtasks?`;
  }

  if (intent === 'split_task' && context.targetTask === null) {
    return 'Pick a task to split. Open your task list and use "Split a task" on a specific item.';
  }

  if (intent === 'next_action') {
    const navigateAction = actions.find(
      (action): action is { type: 'navigate'; navigate: { path: string; label: string } } =>
        action.type === 'navigate',
    );
    if (navigateAction !== undefined && navigateAction.navigate.label.startsWith('Open "')) {
      return `Start with ${navigateAction.navigate.label.replace('Open ', '')}. A 45-minute focus block is a good next step.`;
    }
  }

  if (context.pendingCount === 0) {
    return 'You have no pending tasks right now. Add a few priorities, then ask me to plan your day.';
  }

  return llmMessage;
}

export async function runPlannerChatWithLlm(
  userId: string,
  intent: PlannerIntent,
  message: string | undefined,
  taskId: string | undefined,
  draftTaskTitle: string | undefined,
): Promise<PlannerChatResult> {
  const context = await buildPlannerContext(userId, taskId, draftTaskTitle);
  let llm = await callPlannerLlm(intent, context, message);
  if (intent === 'split_task') {
    llm = enforceSplitClarification(context, message, llm);
  }
  const actions = mapLlmToActions(intent, context, llm);
  const displayMessage = composeDisplayMessage(intent, context, llm.message, actions);
  const needsClarification = intent === 'split_task' && llm.needsClarification === true;

  return {
    message: displayMessage,
    actions,
    needsClarification,
  };
}
