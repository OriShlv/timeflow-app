import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactElement,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button, Searchbar, Select } from '../../components/ui';
import type { SelectOption } from '../../components/ui/Select';
import { toUiErrorMessage } from '../../lib/apiFeedback';
import { useFocusSession } from '../../lib/FocusSessionContext';
import { usePlannerAgent } from '../../lib/PlannerAgentContext';
import { getTasks } from '../../lib/tasksApi';
import { updateTask } from '../../lib/tasksApi';
import { subscribeTasksRefresh } from '../../lib/tasksRefresh';
import type { ListTasksParams, Task, TaskStatus } from '../../lib/types';
import { TaskCard } from './TaskCard';
import { buildTaskDisplayItems, mergeSubtasks } from './taskDisplay';
import './TasksList.css';

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELED', label: 'Canceled' },
];

export type TasksListHandle = {
  reload: () => void;
};

export type TasksListProps = {
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
};

function buildParams(
  page: number,
  pageSize: number,
  searchQuery: string,
  statusFilter: TaskStatus | '',
  fromDate: string,
  toDate: string,
  sort: 'createdAt' | 'dueAt',
  order: 'asc' | 'desc',
): ListTasksParams {
  const params: ListTasksParams = {
    page,
    pageSize,
    sort,
    order,
  };

  const q = searchQuery.trim();
  if (q.length > 0) {
    params.q = q;
  }
  if (statusFilter !== '') {
    params.status = statusFilter;
  }
  if (fromDate.length > 0) {
    params.from = `${fromDate}T00:00:00.000Z`;
  }
  if (toDate.length > 0) {
    params.to = `${toDate}T23:59:59.999Z`;
  }

  return params;
}

export const TasksList = forwardRef<TasksListHandle, TasksListProps>(
  function TasksList(props, ref): ReactElement {
    const focus = useFocusSession();
    const planner = usePlannerAgent();
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>(
      (searchParams.get('status') as TaskStatus | '') ?? '',
    );
    const [sort, setSort] = useState<'createdAt' | 'dueAt'>(
      searchParams.get('sort') === 'dueAt' ? 'dueAt' : 'createdAt',
    );
    const [order, setOrder] = useState<'asc' | 'desc'>(
      searchParams.get('order') === 'asc' ? 'asc' : 'desc',
    );
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [page, setPage] = useState<number>(1);
    const pageSize = 20;
    const [totalPages, setTotalPages] = useState<number>(1);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(() => new Set());
    const [loadedSubtasksByParent, setLoadedSubtasksByParent] = useState<Record<string, Task[]>>({});

    const expandParentFromUrl = searchParams.get('expandParent');

    const fetchTasks = useCallback(
      (targetPage: number): void => {
        setLoading(true);
        setError(null);

        getTasks(buildParams(targetPage, pageSize, searchQuery, statusFilter, fromDate, toDate, sort, order))
          .then((result) => {
            setTasks(result.items);
            setTotalPages(result.totalPages);
            setLoadedSubtasksByParent({});
            setLoading(false);
          })
          .catch((err: unknown) => {
            setError(toUiErrorMessage(err));
            setLoading(false);
          });
      },
      [pageSize, searchQuery, statusFilter, fromDate, toDate, sort, order],
    );

    const load = useCallback((): void => {
      fetchTasks(page);
    }, [fetchTasks, page]);

    useImperativeHandle(ref, () => ({ reload: load }), [load]);

    const loadSubtasksForParent = useCallback(
      async (parentId: string): Promise<void> => {
        const params = buildParams(1, 50, searchQuery, statusFilter, fromDate, toDate, sort, order);
        params.parentTaskId = parentId;
        const result = await getTasks(params);
        setLoadedSubtasksByParent((prev) => ({
          ...prev,
          [parentId]: result.items,
        }));
      },
      [searchQuery, statusFilter, fromDate, toDate, sort, order],
    );

    useEffect(() => {
      fetchTasks(page);
    }, [fetchTasks, page]);

    useEffect(() => {
      if (expandParentFromUrl === null || expandParentFromUrl.length === 0) {
        return;
      }
      setExpandedParentIds((prev) => {
        const next = new Set(prev);
        next.add(expandParentFromUrl);
        return next;
      });
      loadSubtasksForParent(expandParentFromUrl).catch((err: unknown) => {
        setError(toUiErrorMessage(err));
      });
    }, [expandParentFromUrl, loadSubtasksForParent]);

    useEffect(() => {
      return subscribeTasksRefresh((detail) => {
        fetchTasks(page);
        if (detail.expandParentId !== undefined) {
          setExpandedParentIds((prev) => {
            const next = new Set(prev);
            next.add(detail.expandParentId as string);
            return next;
          });
        }
      });
    }, [fetchTasks, page]);

    const mergedTasks = useMemo(() => {
      const extraSubtasks = Object.values(loadedSubtasksByParent).flat();
      return mergeSubtasks(tasks, extraSubtasks);
    }, [tasks, loadedSubtasksByParent]);

    const displayItems = useMemo(() => buildTaskDisplayItems(mergedTasks), [mergedTasks]);

    const onToggleExpand = useCallback(
      (parentId: string, knownSubtaskCount: number): void => {
        const isExpanded = expandedParentIds.has(parentId);
        if (isExpanded) {
          setExpandedParentIds((prev) => {
            const next = new Set(prev);
            next.delete(parentId);
            return next;
          });
          return;
        }
        setExpandedParentIds((prev) => {
          const next = new Set(prev);
          next.add(parentId);
          return next;
        });
        if (knownSubtaskCount === 0) {
          loadSubtasksForParent(parentId).catch((err: unknown) => {
            setError(toUiErrorMessage(err));
          });
        }
      },
      [expandedParentIds, loadSubtasksForParent],
    );

    const onSearchChange = useCallback((value: string): void => {
      setSearchQuery(value);
      setPage(1);
    }, []);

    const clearFilters = useCallback((): void => {
      setSearchQuery('');
      setStatusFilter('');
      setFromDate('');
      setToDate('');
      setSort('createdAt');
      setOrder('desc');
      setPage(1);
    }, []);

    const onMarkDone = useCallback((task: Task): void => {
      if (task.status === 'DONE') {
        return;
      }
      setActionLoadingId(task.id);
      const previous = tasks;
      setTasks((items) =>
        items.map((item) => (item.id === task.id ? { ...item, status: 'DONE' as const } : item)),
      );
      updateTask(task.id, {
        title: undefined,
        description: undefined,
        status: 'DONE',
        dueAt: undefined,
      })
        .catch((err: unknown) => {
          setTasks(previous);
          setError(toUiErrorMessage(err));
        })
        .finally(() => {
          setActionLoadingId(null);
        });
    }, [tasks]);

    const onSnooze = useCallback((task: Task): void => {
      const base = task.dueAt === null ? new Date() : new Date(task.dueAt);
      base.setUTCDate(base.getUTCDate() + 1);
      setActionLoadingId(task.id);
      updateTask(task.id, {
        title: undefined,
        description: undefined,
        status: undefined,
        dueAt: base.toISOString(),
      })
        .then((updated) => {
          setTasks((items) => items.map((item) => (item.id === task.id ? updated : item)));
        })
        .catch((err: unknown) => {
          setError(toUiErrorMessage(err));
        })
        .finally(() => {
          setActionLoadingId(null);
        });
    }, []);

    const onStartFocus = useCallback((task: Task): void => {
      setActionLoadingId(task.id);
      focus
        .startFocus(task.id, task.title)
        .catch((err: unknown) => {
          setError(toUiErrorMessage(err));
        })
        .finally(() => {
          setActionLoadingId(null);
        });
    }, [focus]);

    const onStopFocus = useCallback((): void => {
      setActionLoadingId('focus-stop');
      focus
        .stopFocus()
        .catch((err: unknown) => {
          setError(toUiErrorMessage(err));
        })
        .finally(() => {
          setActionLoadingId(null);
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

    const onSplitWithPlanner = useCallback(
      (task: Task): void => {
        planner.openPopup({ intent: 'split_task', taskId: task.id, taskTitle: task.title });
      },
      [planner],
    );

    const goToPage = useCallback(
      (p: number): void => {
        if (p < 1 || p > totalPages) {
          return;
        }
        setPage(p);
      },
      [totalPages],
    );

    const doneCount = tasks.filter((t) => t.status === 'DONE').length;
    const progressPercent = tasks.length === 0 ? 0 : (doneCount / tasks.length) * 100;

    return (
      <div className="tasks-list">
        <section className="filters-section">
          <Searchbar
            value={searchQuery}
            placeholder="Search tasks"
            debounceMs={300}
            className="search-bar"
            onChange={onSearchChange}
          />
          <div className="filters-row">
            <Select
              value={statusFilter}
              options={STATUS_OPTIONS}
              placeholder="Status"
              disabled={false}
              className="filter-select"
              onChange={(value) => {
                setStatusFilter(value as TaskStatus | '');
                setPage(1);
              }}
            />
            <Select
              value={`${sort}:${order}`}
              options={[
                { value: 'dueAt:asc', label: 'Due soon' },
                { value: 'dueAt:desc', label: 'Overdue first' },
                { value: 'createdAt:desc', label: 'Recently added' },
              ]}
              placeholder="Sort"
              disabled={false}
              className="filter-select"
              onChange={(value) => {
                const [nextSort, nextOrder] = value.split(':');
                setSort(nextSort === 'dueAt' ? 'dueAt' : 'createdAt');
                setOrder(nextOrder === 'asc' ? 'asc' : 'desc');
                setPage(1);
              }}
            />
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              className="date-input"
              title="From"
            />
            <span className="date-sep">–</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              className="date-input"
              title="To"
            />
            <Button
              type="button"
              fill="outline"
              size="small"
              expand={undefined}
              color="default"
              disabled={false}
              className={undefined}
              aria-label={undefined}
              onClick={clearFilters}
            >
              Clear
            </Button>
          </div>
        </section>

        {error !== null ? (
          <div className="error-banner">
            <span>{error}</span>
            <Button
              type="button"
              fill="clear"
              size="small"
              expand={undefined}
              color="default"
              disabled={loading}
              className={undefined}
              aria-label="Retry loading tasks"
              onClick={load}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!loading && tasks.length > 0 ? (
          <div className="progress-bar-wrap">
            <div
              className="progress-bar"
              role="progressbar"
              aria-valuenow={doneCount}
              aria-valuemax={tasks.length}
            >
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="progress-label">
              {doneCount} of {tasks.length} done
            </span>
          </div>
        ) : null}

        <div className="task-cards">
          {displayItems.map((item) => {
            if (item.type === 'orphan') {
              return (
                <div key={item.task.id} className="task-group">
                  <TaskCard
                    task={item.task}
                    isSubtask={true}
                    actionLoadingId={actionLoadingId}
                    isInFocus={focus.isTaskInFocus(item.task.id)}
                    subtaskCount={undefined}
                    expanded={undefined}
                    onToggleExpand={undefined}
                    focusActionLoading={focus.actionLoading}
                    onMarkDone={onMarkDone}
                    onSnooze={onSnooze}
                    onFocusTaskAction={onFocusTaskAction}
                    onSplitWithPlanner={onSplitWithPlanner}
                    onEditTask={props.onEditTask}
                    onDeleteTask={props.onDeleteTask}
                  />
                </div>
              );
            }

            const { parent, subtasks } = item.group;
            const isExpanded = expandedParentIds.has(parent.id);
            const subtaskCount = subtasks.length;

            return (
              <div key={parent.id} className="task-group">
                <TaskCard
                  task={parent}
                  isSubtask={false}
                  actionLoadingId={actionLoadingId}
                  isInFocus={focus.isTaskInFocus(parent.id)}
                  subtaskCount={subtaskCount > 0 ? subtaskCount : undefined}
                  expanded={isExpanded}
                  onToggleExpand={
                    subtaskCount > 0
                      ? () => onToggleExpand(parent.id, subtaskCount)
                      : undefined
                  }
                  focusActionLoading={focus.actionLoading}
                  onMarkDone={onMarkDone}
                  onSnooze={onSnooze}
                  onFocusTaskAction={onFocusTaskAction}
                  onSplitWithPlanner={onSplitWithPlanner}
                  onEditTask={props.onEditTask}
                  onDeleteTask={props.onDeleteTask}
                />
                {isExpanded && subtaskCount > 0 ? (
                  <div className="task-group__subtasks">
                    {subtasks.map((subtask) => (
                      <TaskCard
                        key={subtask.id}
                        task={subtask}
                        isSubtask={true}
                        actionLoadingId={actionLoadingId}
                        isInFocus={focus.isTaskInFocus(subtask.id)}
                        subtaskCount={undefined}
                        expanded={undefined}
                        onToggleExpand={undefined}
                        focusActionLoading={focus.actionLoading}
                        onMarkDone={onMarkDone}
                        onSnooze={onSnooze}
                        onFocusTaskAction={onFocusTaskAction}
                        onSplitWithPlanner={onSplitWithPlanner}
                        onEditTask={props.onEditTask}
                        onDeleteTask={props.onDeleteTask}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          {!loading && tasks.length === 0 ? (
            <div className="empty-state">
              {statusFilter !== '' || searchQuery.trim().length > 0 || fromDate.length > 0 || toDate.length > 0
                ? 'No tasks match this filter. Clear filters to see all tasks.'
                : 'No tasks yet. Create your first task to start onboarding.'}
            </div>
          ) : null}
        </div>

        {totalPages > 1 ? (
          <div className="pagination">
            <Button
              type="button"
              fill="outline"
              size="small"
              expand={undefined}
              color="default"
              disabled={page <= 1}
              className={undefined}
              aria-label={undefined}
              onClick={() => goToPage(page - 1)}
            >
              Prev
            </Button>
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              fill="outline"
              size="small"
              expand={undefined}
              color="default"
              disabled={page >= totalPages}
              className={undefined}
              aria-label={undefined}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    );
  },
);
