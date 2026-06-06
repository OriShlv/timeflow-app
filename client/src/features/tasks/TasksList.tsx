import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactElement,
} from 'react';

import { Button, Searchbar, Select } from '../../components/ui';
import type { SelectOption } from '../../components/ui/Select';
import { getTasks } from '../../lib/tasksApi';
import type { ListTasksParams, Task, TaskStatus } from '../../lib/types';
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

function buildParams(
  page: number,
  pageSize: number,
  searchQuery: string,
  statusFilter: TaskStatus | '',
  fromDate: string,
  toDate: string,
): ListTasksParams {
  const params: ListTasksParams = {
    page,
    pageSize,
    sort: 'createdAt',
    order: 'desc',
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
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [page, setPage] = useState<number>(1);
    const pageSize = 20;
    const [totalPages, setTotalPages] = useState<number>(1);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTasks = useCallback(
      (targetPage: number): void => {
        setLoading(true);
        setError(null);

        getTasks(buildParams(targetPage, pageSize, searchQuery, statusFilter, fromDate, toDate))
          .then((result) => {
            setTasks(result.items);
            setTotalPages(result.totalPages);
            setLoading(false);
          })
          .catch((err: Error) => {
            setError(err.message);
            setLoading(false);
          });
      },
      [pageSize, searchQuery, statusFilter, fromDate, toDate],
    );

    const load = useCallback((): void => {
      fetchTasks(page);
    }, [fetchTasks, page]);

    useImperativeHandle(ref, () => ({ reload: load }), [load]);

    useEffect(() => {
      fetchTasks(page);
    }, [fetchTasks, page]);

    const onSearchChange = useCallback((value: string): void => {
      setSearchQuery(value);
      setPage(1);
    }, []);

    const clearFilters = useCallback((): void => {
      setSearchQuery('');
      setStatusFilter('');
      setFromDate('');
      setToDate('');
      setPage(1);
    }, []);

    const applyFilters = useCallback((): void => {
      setPage(1);
      setLoading(true);
      setError(null);
      getTasks(buildParams(1, pageSize, searchQuery, statusFilter, fromDate, toDate))
        .then((result) => {
          setTasks(result.items);
          setTotalPages(result.totalPages);
          setLoading(false);
        })
        .catch((err: Error) => {
          setError(err.message);
          setLoading(false);
        });
    }, [pageSize, searchQuery, statusFilter, fromDate, toDate]);

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
              onChange={(value) => setStatusFilter(value as TaskStatus | '')}
            />
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="date-input"
              title="From"
            />
            <span className="date-sep">–</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
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
            <Button
              type="button"
              fill="solid"
              size="small"
              expand={undefined}
              color="default"
              disabled={false}
              className={undefined}
              aria-label={undefined}
              onClick={applyFilters}
            >
              Apply
            </Button>
          </div>
        </section>

        {error !== null ? <div className="error-banner">{error}</div> : null}

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
          {tasks.map((task) => (
            <article
              key={task.id}
              className={`task-card ${task.status === 'DONE' ? 'task-done' : ''}`}
            >
              <div className="task-card-status" data-status={task.status} />
              <div className="task-card-body">
                <h3 className="task-title">{task.title}</h3>
                {task.description !== null ? (
                  <p className="task-desc">{task.description}</p>
                ) : null}
                {task.dueAt !== null ? (
                  <p className="task-due">{formatDue(task.dueAt)}</p>
                ) : null}
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
                      disabled={false}
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
                      disabled={false}
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
          ))}
          {!loading && tasks.length === 0 ? (
            <div className="empty-state">No tasks yet</div>
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
