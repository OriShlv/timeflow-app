import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Fab, Modal, Toast } from '../components/ui';
import { AgentPlaceholder } from '../features/home/AgentPlaceholder';
import { FeatureShortcuts } from '../features/home/FeatureShortcuts';
import { HomeRecommendations } from '../features/home/HomeRecommendations';
import { TaskCalendar, tasksForDate } from '../features/home/TaskCalendar';
import { TaskForm } from '../features/tasks/TaskForm';
import { useAuth } from '../lib/AuthContext';
import { toUiErrorMessage } from '../lib/apiFeedback';
import { formatDate, formatTime, hourInTimezone } from '../lib/dateFormat';
import { useT } from '../lib/i18n/I18nContext';
import { getDailyFocusSummary } from '../lib/focusSessionsApi';
import { getInsights } from '../lib/insightsApi';
import { getTasks } from '../lib/tasksApi';
import { subscribeTasksRefresh } from '../lib/tasksRefresh';
import type { DailyFocusSummary, InsightsRecommendation, Task, TaskSummary } from '../lib/types';
import { useUserPreferences } from '../lib/useUserPreferences';
import './HomePage.css';

function greetingForHour(hour: number, t: (key: string) => string): string {
  if (hour < 12) {
    return t('home.goodMorning');
  }
  if (hour < 17) {
    return t('home.goodAfternoon');
  }
  return t('home.goodEvening');
}

function formatSelectedDate(date: Date, timezone: string, language: 'en' | 'he'): string {
  return formatDate(date, timezone, language, { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatDueTime(value: string, timezone: string, language: 'en' | 'he'): string {
  return formatTime(value, timezone, language, { hour: 'numeric', minute: '2-digit' });
}

export function HomePage(): ReactElement {
  const auth = useAuth();
  const t = useT();
  const { timezone, language } = useUserPreferences();
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [recommendations, setRecommendations] = useState<InsightsRecommendation[]>([]);
  const [focusSummary, setFocusSummary] = useState<DailyFocusSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewYear, setViewYear] = useState<number>(() => now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => now.getMonth());
  const [taskFormOpen, setTaskFormOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const load = useCallback((): void => {
    setLoading(true);
    setError(null);

    const loadPendingTasks = async (): Promise<Task[]> => {
      const pageSize = 50;
      let page = 1;
      let totalPages = 1;
      const items: Task[] = [];
      while (page <= totalPages) {
        const result = await getTasks({
          page,
          pageSize,
          sort: 'dueAt',
          order: 'asc',
          status: 'PENDING',
        });
        totalPages = result.totalPages;
        items.push(...result.items.filter((task) => task.dueAt !== null));
        page += 1;
      }
      return items;
    };

    Promise.all([loadPendingTasks(), getInsights(), getDailyFocusSummary(undefined)])
      .then(([pendingTasks, insights, focus]) => {
        setTasks(pendingTasks);
        setSummary(insights.taskSummary);
        setRecommendations(insights.recommendations);
        setFocusSummary(focus);
      })
      .catch((err: unknown) => {
        setError(toUiErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return subscribeTasksRefresh(() => {
      load();
    });
  }, [load]);

  const onViewMonthChange = useCallback((year: number, month: number): void => {
    setViewYear(year);
    setViewMonth(month);
  }, []);

  const onTaskSaved = useCallback((): void => {
    setTaskFormOpen(false);
    load();
    setToastMessage(t('home.toast.created'));
  }, [load, t]);

  const selectedTasks = useMemo(() => tasksForDate(tasks, selectedDate), [tasks, selectedDate]);
  const displayName = auth.user?.name ?? auth.user?.email?.split('@')[0] ?? 'there';

  return (
    <div className="home-page">
      <div className="home-page__inner">
        <header className="home-page__header">
          <div>
            <p className="home-page__greeting">
              {greetingForHour(hourInTimezone(timezone), t)}, {displayName}
            </p>
            <h1 className="home-page__title">Dashboard</h1>
            <p className="home-page__subtitle">
              {formatSelectedDate(now, timezone, language)}
            </p>
          </div>
        </header>

        {loading ? <div className="home-page__state">Loading your schedule...</div> : null}
        {error !== null ? (
          <div className="home-page__state home-page__state--error">
            <span>{error}</span>
            <Button
              type="button"
              fill="clear"
              size="small"
              expand={undefined}
              color="default"
              disabled={false}
              className={undefined}
              aria-label="Retry loading dashboard"
              onClick={load}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!loading && error === null ? (
          <>
            <div className="home-page__stats">
              <div className="home-stat">
                <span className="home-stat__label">Pending</span>
                <span className="home-stat__value">{summary?.pending ?? 0}</span>
              </div>
              <div className="home-stat home-stat--warn">
                <span className="home-stat__label">Overdue</span>
                <span className="home-stat__value">{summary?.overdue ?? 0}</span>
              </div>
              <div className="home-stat home-stat--focus">
                <span className="home-stat__label">Focus today</span>
                <span className="home-stat__value">{focusSummary?.totalMinutes ?? 0}m</span>
              </div>
            </div>

            <div className="home-page__layout">
              <div className="home-page__main">
                <TaskCalendar
                  tasks={tasks}
                  selectedDate={selectedDate}
                  viewYear={viewYear}
                  viewMonth={viewMonth}
                  onSelectDate={setSelectedDate}
                  onViewMonthChange={onViewMonthChange}
                />
                <section className="home-day-panel" aria-label="Tasks for selected day">
                  <div className="home-day-panel__header">
                    <h2 className="home-day-panel__title">{formatSelectedDate(selectedDate, timezone, language)}</h2>
                    <Button
                      type="button"
                      fill="outline"
                      size="small"
                      expand={undefined}
                      color="default"
                      disabled={false}
                      className={undefined}
                      aria-label="Open tasks list"
                      onClick={() => navigate('/tasks?status=PENDING&sort=dueAt&order=asc')}
                    >
                      All tasks
                    </Button>
                  </div>
                  {selectedTasks.length === 0 ? (
                    <p className="home-day-panel__empty">{t('home.noTasksDue')}</p>
                  ) : (
                    <ul className="home-day-panel__list">
                      {selectedTasks.map((task) => (
                        <li key={task.id} className="home-day-panel__item">
                          <span className="home-day-panel__task-title">{task.title}</span>
                          {task.dueAt !== null ? (
                            <span className="home-day-panel__task-time">{formatDueTime(task.dueAt, timezone, language)}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
              <aside className="home-page__aside">
                <HomeRecommendations recommendations={recommendations} />
                <FeatureShortcuts />
                <AgentPlaceholder />
              </aside>
            </div>
          </>
        ) : null}
      </div>
      <Fab iconName="add" ariaLabel={t('home.createTask')} onClick={() => setTaskFormOpen(true)} />
      <Modal isOpen={taskFormOpen} onClose={() => setTaskFormOpen(false)}>
        <TaskForm task={null} onClose={() => setTaskFormOpen(false)} onSaved={onTaskSaved} />
      </Modal>
      <Toast
        isOpen={toastMessage.length > 0}
        message={toastMessage}
        durationMs={2500}
        onDismiss={() => setToastMessage('')}
      />
    </div>
  );
}
