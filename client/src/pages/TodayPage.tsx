import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/ui';
import { FocusSessionPanel } from '../components/focus/FocusSessionPanel';
import { toUiErrorMessage } from '../lib/apiFeedback';
import { useFocusSession } from '../lib/FocusSessionContext';
import { getTasks, updateTask } from '../lib/tasksApi';
import type { Task } from '../lib/types';
import './TodayPage.css';

function isUrgentTask(task: Task): boolean {
  if (task.status !== 'PENDING') {
    return false;
  }
  if (task.dueAt === null) {
    return false;
  }
  const dueDate = new Date(task.dueAt);
  const now = new Date();
  return dueDate.getTime() <= now.getTime() + 24 * 60 * 60 * 1000;
}

function formatDueDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function TodayPage(): ReactElement {
  const navigate = useNavigate();
  const focus = useFocusSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);

  const loadToday = useCallback((): void => {
    setLoading(true);
    setError(null);
    getTasks({
      page: 1,
      pageSize: 8,
      sort: 'dueAt',
      order: 'asc',
      status: 'PENDING',
    })
      .then((result) => {
        const urgentTasks = result.items.filter((task) => isUrgentTask(task)).slice(0, 5);
        setTasks(urgentTasks);
      })
      .catch((err: unknown) => {
        setError(toUiErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  const onMarkDone = useCallback((task: Task): void => {
    setActionTaskId(task.id);
    updateTask(task.id, {
      title: undefined,
      description: undefined,
      status: 'DONE',
      dueAt: undefined,
    })
      .then(() => {
        setTasks((current) => current.filter((item) => item.id !== task.id));
      })
      .catch((err: unknown) => {
        setError(toUiErrorMessage(err));
      })
      .finally(() => {
        setActionTaskId(null);
      });
  }, []);

  const onSnooze = useCallback((task: Task): void => {
    const base = task.dueAt === null ? new Date() : new Date(task.dueAt);
    base.setUTCDate(base.getUTCDate() + 1);
    setActionTaskId(task.id);
    updateTask(task.id, {
      title: undefined,
      description: undefined,
      status: undefined,
      dueAt: base.toISOString(),
    })
      .then(() => {
        setTasks((current) => current.filter((item) => item.id !== task.id));
      })
      .catch((err: unknown) => {
        setError(toUiErrorMessage(err));
      })
      .finally(() => {
        setActionTaskId(null);
      });
  }, []);

  const onStartFocus = useCallback((task: Task): void => {
    setActionTaskId(task.id);
    focus
      .startFocus(task.id, task.title)
      .catch((err: unknown) => {
        setError(toUiErrorMessage(err));
      })
      .finally(() => {
        setActionTaskId(null);
      });
  }, [focus]);

  const onStopFocus = useCallback((): void => {
    setActionTaskId('focus-stop');
    focus
      .stopFocus()
      .catch((err: unknown) => {
        setError(toUiErrorMessage(err));
      })
      .finally(() => {
        setActionTaskId(null);
      });
  }, [focus]);

  const onFocusTaskAction = useCallback(
    (task: Task): void => {
      if (focus.isTaskInFocus(task.id)) {
        onStopFocus();
        return;
      }
      onStartFocus(task);
    },
    [focus, onStartFocus, onStopFocus],
  );

  return (
    <div className="today-page">
      <div className="today-page__inner">
        <header className="today-page__header">
          <h2 className="today-page__title">Today</h2>
          <p className="today-page__subtitle">Urgent tasks and quick execution</p>
        </header>
        <FocusSessionPanel
          onError={(message) => {
            setError(message);
          }}
        />
        <section className="today-page__section">
          <div className="today-page__section-header">
            <h3>Urgent tasks</h3>
            <Button
              type="button"
              fill="outline"
              size="small"
              expand={undefined}
              color="default"
              disabled={false}
              className={undefined}
              aria-label="Open all tasks"
              onClick={() => navigate('/tasks')}
            >
              Open tasks
            </Button>
          </div>
          {loading ? (
            <div className="today-page__state">Loading today plan...</div>
          ) : null}
          {error !== null ? (
            <div className="today-page__state today-page__state--error">
              <span>{error}</span>
              <Button
                type="button"
                fill="clear"
                size="small"
                expand={undefined}
                color="default"
                disabled={false}
                className={undefined}
                aria-label="Retry loading today"
                onClick={loadToday}
              >
                Retry
              </Button>
            </div>
          ) : null}
          {!loading && error === null && tasks.length === 0 ? (
            <div className="today-page__state">No urgent tasks right now.</div>
          ) : null}
          {!loading && error === null && tasks.length > 0 ? (
            <div className="today-page__list">
              {tasks.map((task) => (
                <article
                  key={task.id}
                  className={`today-task-card ${focus.isTaskInFocus(task.id) ? 'today-task-card--in-focus' : ''}`}
                >
                  <div className="today-task-card__content">
                    <h4>{task.title}</h4>
                    {task.dueAt !== null ? <p>Due {formatDueDate(task.dueAt)}</p> : null}
                  </div>
                  <div className="today-task-card__actions">
                    <Button
                      type="button"
                      fill="clear"
                      size="small"
                      expand={undefined}
                      color="default"
                      disabled={actionTaskId === task.id}
                      className={undefined}
                      aria-label={undefined}
                      onClick={() => onMarkDone(task)}
                    >
                      Mark done
                    </Button>
                    <Button
                      type="button"
                      fill="clear"
                      size="small"
                      expand={undefined}
                      color="default"
                      disabled={actionTaskId === task.id}
                      className={undefined}
                      aria-label={undefined}
                      onClick={() => onSnooze(task)}
                    >
                      Snooze
                    </Button>
                    <Button
                      type="button"
                      fill="clear"
                      size="small"
                      expand={undefined}
                      color="default"
                      disabled={actionTaskId === task.id || focus.actionLoading}
                      className={undefined}
                      aria-label={undefined}
                      onClick={() => onFocusTaskAction(task)}
                    >
                      {focus.isTaskInFocus(task.id) ? 'Stop focus' : 'Start focus'}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
