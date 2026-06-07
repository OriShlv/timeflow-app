import type { ReactElement } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '../../components/ui';
import type { Task, TaskStatus } from '../../lib/types';
import { cn } from '../../lib/cn';

export type TaskCardProps = {
  task: Task;
  isSubtask: boolean;
  actionLoadingId: string | null;
  isInFocus: boolean;
  subtaskCount: number | undefined;
  expanded: boolean | undefined;
  onToggleExpand: (() => void) | undefined;
  onMarkDone: (task: Task) => void;
  onSnooze: (task: Task) => void;
  onFocusTaskAction: (task: Task) => void;
  onSplitWithPlanner: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  focusActionLoading: boolean;
};

function statusLabel(status: TaskStatus): string {
  switch (status) {
    case 'DONE':
      return 'Done';
    case 'CANCELED':
      return 'Canceled';
    default:
      return 'Pending';
  }
}

function formatDue(dueAt: string): string {
  const d = new Date(dueAt);
  return d.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function TaskCard(props: TaskCardProps): ReactElement {
  const { task } = props;
  const showExpand = props.subtaskCount !== undefined && props.subtaskCount > 0 && props.onToggleExpand !== undefined;

  return (
    <article
      className={cn(
        'task-card',
        props.isSubtask ? 'task-card--subtask' : undefined,
        task.status === 'DONE' ? 'task-done' : undefined,
        props.isInFocus ? 'task-card--in-focus' : undefined,
      )}
    >
      <div className="task-card-status" data-status={task.status} />
      <div className="task-card-body">
        <div className="task-card-header">
          {showExpand ? (
            <button
              type="button"
              className="task-expand-toggle"
              aria-expanded={props.expanded === true}
              aria-label={
                props.expanded === true
                  ? `Hide ${props.subtaskCount} sub-tasks`
                  : `Show ${props.subtaskCount} sub-tasks`
              }
              onClick={props.onToggleExpand}
            >
              {props.expanded === true ? (
                <ChevronUp size={18} aria-hidden={true} />
              ) : (
                <ChevronDown size={18} aria-hidden={true} />
              )}
              <span className="task-expand-toggle__count">{props.subtaskCount}</span>
            </button>
          ) : null}
          <h3 className="task-title">{task.title}</h3>
        </div>
        {task.description !== null ? <p className="task-desc">{task.description}</p> : null}
        {task.dueAt !== null ? <p className="task-due">{formatDue(task.dueAt)}</p> : null}
        <div className="task-card-footer">
          <span className="status-pill" data-status={task.status}>
            {statusLabel(task.status)}
          </span>
          <div className="task-actions">
            <Button
              type="button"
              fill="clear"
              size="small"
              expand={undefined}
              color="default"
              disabled={props.actionLoadingId === task.id}
              className={undefined}
              aria-label={undefined}
              onClick={() => props.onMarkDone(task)}
            >
              Done
            </Button>
            <Button
              type="button"
              fill="clear"
              size="small"
              expand={undefined}
              color="default"
              disabled={props.actionLoadingId === task.id}
              className={undefined}
              aria-label={undefined}
              onClick={() => props.onSnooze(task)}
            >
              Snooze
            </Button>
            <Button
              type="button"
              fill="clear"
              size="small"
              expand={undefined}
              color="default"
              disabled={props.actionLoadingId === task.id || props.focusActionLoading}
              className={undefined}
              aria-label={undefined}
              onClick={() => props.onFocusTaskAction(task)}
            >
              {props.isInFocus ? 'Stop focus' : 'Focus'}
            </Button>
            {task.status === 'PENDING' && !props.isSubtask ? (
              <Button
                type="button"
                fill="clear"
                size="small"
                expand={undefined}
                color="default"
                disabled={props.actionLoadingId === task.id}
                className={undefined}
                aria-label={undefined}
                onClick={() => props.onSplitWithPlanner(task)}
              >
                Split
              </Button>
            ) : null}
            <Button
              type="button"
              fill="clear"
              size="small"
              expand={undefined}
              color="default"
              disabled={props.actionLoadingId === task.id}
              className={undefined}
              aria-label={undefined}
              onClick={() => props.onEditTask(task)}
            >
              Edit
            </Button>
            <Button
              type="button"
              fill="clear"
              size="small"
              expand={undefined}
              color="danger"
              disabled={props.actionLoadingId === task.id}
              className={undefined}
              aria-label={undefined}
              onClick={() => props.onDeleteTask(task)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
