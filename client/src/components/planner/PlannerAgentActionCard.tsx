import type { ReactElement } from 'react';

import { Button } from '../ui/Button';
import type {
  PlannerAgentAction,
  PlannerCreateSubtasksAction,
  PlannerPickTaskAction,
  PlannerProposeDraftSubtasksAction,
  PlannerQuickIntentsAction,
  PlannerIntent,
  PlannerScheduleBlock,
  PlannerSubTaskProposal,
} from '../../lib/plannerAgentTypes';
import { cn } from '../../lib/cn';

export type PlannerAgentActionCardProps = {
  action: PlannerAgentAction;
  applying: boolean;
  onApplySubtasks: (action: PlannerCreateSubtasksAction) => void;
  onNavigate: (path: string) => void;
  onPickTask: (taskId: string, title: string) => void;
  onConfirmDraftAdd: (action: PlannerProposeDraftSubtasksAction) => void;
  onSkipDraftAdd: (action: PlannerProposeDraftSubtasksAction) => void;
  onQuickIntent: (intent: PlannerIntent) => void;
  onKeepChatOpen: () => void;
  onCloseChat: () => void;
  onStartFocus: (taskId: string, taskTitle: string) => void;
  startingFocusTaskId: string | null;
};

function formatBlockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function ScheduleBlocksCard(props: {
  blocks: PlannerScheduleBlock[];
  onStartFocus: (taskId: string, taskTitle: string) => void;
  startingFocusTaskId: string | null;
}): ReactElement {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {props.blocks.map((block, index) => {
        const canStartFocus = block.taskId !== null;
        const isStarting = block.taskId !== null && props.startingFocusTaskId === block.taskId;
        return (
          <li
            key={`${block.startTime}-${block.label}`}
            className="rounded-tf-sm border border-border bg-card px-3 py-2 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold text-text">
                  {formatBlockTime(block.startTime)}–{formatBlockTime(block.endTime)}
                </span>
                <span className="text-text-muted"> · {block.label}</span>
              </div>
              {canStartFocus ? (
                <Button
                  type="button"
                  fill={index === 0 ? 'solid' : 'outline'}
                  size="small"
                  expand={undefined}
                  color="default"
                  disabled={props.startingFocusTaskId !== null}
                  className={cn('shrink-0')}
                  aria-label={`Start focus on ${block.label}`}
                  onClick={() => {
                    if (block.taskId === null) {
                      return;
                    }
                    props.onStartFocus(block.taskId, block.label);
                  }}
                >
                  {isStarting ? 'Starting…' : 'Start focus'}
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SubtasksList(props: { subtasks: PlannerSubTaskProposal[] }): ReactElement {
  const subtaskCount = props.subtasks.length;
  const totalMinutes = props.subtasks.reduce((sum, item) => sum + item.suggestedMinutes, 0);

  return (
    <div className="px-3 py-3">
      <p className="m-0 mb-2 text-xs text-text-muted">
        {subtaskCount} proposed sub-task{subtaskCount === 1 ? '' : 's'} · ~{totalMinutes} min total
      </p>
      <ol className="m-0 flex list-none flex-col gap-0 p-0">
        {props.subtasks.map((subtask, index) => (
          <li key={`${subtask.title}-${index}`} className="relative flex gap-3 pb-3 last:pb-0">
            {index < props.subtasks.length - 1 ? (
              <span
                className="absolute left-[11px] top-6 bottom-0 w-px bg-border"
                aria-hidden={true}
              />
            ) : null}
            <span className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="m-0 text-sm font-medium text-text">{subtask.title}</p>
              <p className="m-0 text-xs text-text-muted">~{subtask.suggestedMinutes} min</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SubtasksProposalCard(props: {
  action: PlannerCreateSubtasksAction;
  applying: boolean;
  onApplySubtasks: (action: PlannerCreateSubtasksAction) => void;
}): ReactElement {
  const { action } = props;
  const subtaskCount = action.subtasks.length;

  return (
    <div className="mt-2 overflow-hidden rounded-tf-sm border border-primary/25 bg-card">
      <div className="border-b border-primary/15 bg-primary-light px-3 py-2.5">
        <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-primary">Parent task</p>
        <p className="m-0 mt-0.5 text-sm font-semibold text-text">{action.parentTaskTitle}</p>
      </div>

      <SubtasksList subtasks={action.subtasks} />

      <div className="border-t border-border bg-surface px-3 py-2.5">
        <Button
          type="button"
          fill="solid"
          size="small"
          expand="block"
          color="default"
          disabled={props.applying}
          className={cn(undefined)}
          aria-label={undefined}
          onClick={() => props.onApplySubtasks(action)}
        >
          {props.applying ? 'Creating…' : `Create ${subtaskCount} linked sub-task${subtaskCount === 1 ? '' : 's'}`}
        </Button>
        <p className="m-0 mt-2 text-[11px] text-text-muted">
          Sub-tasks will appear linked to the parent in your task list
        </p>
      </div>
    </div>
  );
}

function DraftSubtasksProposalCard(props: {
  action: PlannerProposeDraftSubtasksAction;
  applying: boolean;
  onConfirmDraftAdd: (action: PlannerProposeDraftSubtasksAction) => void;
  onSkipDraftAdd: (action: PlannerProposeDraftSubtasksAction) => void;
}): ReactElement {
  const { action } = props;

  return (
    <div className="mt-2 overflow-hidden rounded-tf-sm border border-primary/25 bg-card">
      <div className="border-b border-primary/15 bg-primary-light px-3 py-2.5">
        <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-primary">New task</p>
        <p className="m-0 mt-0.5 text-sm font-semibold text-text">{action.parentTaskTitle}</p>
      </div>

      <SubtasksList subtasks={action.subtasks} />

      <div className="flex flex-col gap-2 border-t border-border bg-surface px-3 py-2.5">
        <Button
          type="button"
          fill="solid"
          size="small"
          expand="block"
          color="default"
          disabled={props.applying}
          className={cn(undefined)}
          aria-label={undefined}
          onClick={() => props.onConfirmDraftAdd(action)}
        >
          {props.applying ? 'Adding…' : 'Add to task list & create subtasks'}
        </Button>
        <Button
          type="button"
          fill="outline"
          size="small"
          expand="block"
          color="default"
          disabled={props.applying}
          className={cn(undefined)}
          aria-label={undefined}
          onClick={() => props.onSkipDraftAdd(action)}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}

function ConfirmCloseChatCard(props: {
  onKeepChatOpen: () => void;
  onCloseChat: () => void;
}): ReactElement {
  return (
    <div className="mt-2 flex flex-col gap-2">
      <Button
        type="button"
        fill="solid"
        size="small"
        expand="block"
        color="default"
        disabled={false}
        className={cn(undefined)}
        aria-label={undefined}
        onClick={props.onKeepChatOpen}
      >
        Keep chatting
      </Button>
      <Button
        type="button"
        fill="outline"
        size="small"
        expand="block"
        color="default"
        disabled={false}
        className={cn(undefined)}
        aria-label={undefined}
        onClick={props.onCloseChat}
      >
        Close chat
      </Button>
    </div>
  );
}

function QuickIntentsCard(props: {
  action: PlannerQuickIntentsAction;
  onQuickIntent: (intent: PlannerIntent) => void;
}): ReactElement {
  return (
    <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
      {props.action.options.map((option) => (
        <li key={option.intent}>
          <button
            type="button"
            className="w-full rounded-tf-sm border border-border bg-card px-3 py-2 text-left text-sm font-medium text-text transition-colors hover:border-primary hover:bg-primary-light"
            onClick={() => props.onQuickIntent(option.intent)}
          >
            {option.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

function PickTaskCard(props: {
  action: PlannerPickTaskAction;
  onPickTask: (taskId: string, title: string) => void;
}): ReactElement {
  if (props.action.tasks.length === 0) {
    return (
      <p className="m-0 mt-2 text-xs text-text-muted">
        No pending tasks yet — type a new task title below.
      </p>
    );
  }

  return (
    <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
      {props.action.tasks.map((task) => (
        <li key={task.taskId}>
          <button
            type="button"
            className="w-full rounded-tf-sm border border-border bg-card px-3 py-2 text-left text-sm font-medium text-text transition-colors hover:border-primary hover:bg-primary-light"
            onClick={() => props.onPickTask(task.taskId, task.title)}
          >
            {task.title}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function PlannerAgentActionCard(props: PlannerAgentActionCardProps): ReactElement {
  const action = props.action;

  if (action.type === 'confirm_close_chat') {
    return (
      <ConfirmCloseChatCard
        onKeepChatOpen={props.onKeepChatOpen}
        onCloseChat={props.onCloseChat}
      />
    );
  }

  if (action.type === 'quick_intents') {
    return <QuickIntentsCard action={action} onQuickIntent={props.onQuickIntent} />;
  }

  if (action.type === 'pick_task') {
    return <PickTaskCard action={action} onPickTask={props.onPickTask} />;
  }

  if (action.type === 'schedule_blocks') {
    return (
      <div className="mt-2 rounded-tf-sm border border-primary/20 bg-primary-light p-3">
        <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
          Suggested focus blocks
        </p>
        <ScheduleBlocksCard
          blocks={action.blocks}
          onStartFocus={props.onStartFocus}
          startingFocusTaskId={props.startingFocusTaskId}
        />
      </div>
    );
  }

  if (action.type === 'navigate') {
    return (
      <div className="mt-2">
        <Button
          type="button"
          fill="outline"
          size="small"
          expand={undefined}
          color="default"
          disabled={false}
          className={undefined}
          aria-label={undefined}
          onClick={() => props.onNavigate(action.navigate.path)}
        >
          {action.navigate.label}
        </Button>
      </div>
    );
  }

  if (action.type === 'propose_draft_subtasks') {
    return (
      <DraftSubtasksProposalCard
        action={action}
        applying={props.applying}
        onConfirmDraftAdd={props.onConfirmDraftAdd}
        onSkipDraftAdd={props.onSkipDraftAdd}
      />
    );
  }

  return (
    <SubtasksProposalCard
      action={action}
      applying={props.applying}
      onApplySubtasks={props.onApplySubtasks}
    />
  );
}
