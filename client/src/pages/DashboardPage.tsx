import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { Fab, Modal, Toast } from '../components/ui';
import { DailyStats } from '../features/dashboard/DailyStats';
import { RecommendationsList } from '../features/dashboard/RecommendationsList';
import { SegmentBadge } from '../features/dashboard/SegmentBadge';
import { SummaryCards } from '../features/dashboard/SummaryCards';
import { TaskForm } from '../features/tasks/TaskForm';
import { toUiErrorMessage } from '../lib/apiFeedback';
import { getDailyFeatures } from '../lib/featuresApi';
import { getDailyFocusSummary } from '../lib/focusSessionsApi';
import { getInsights } from '../lib/insightsApi';
import type { DailyFeatureRow, DailyFocusSummary, Insights, InsightsRecommendation } from '../lib/types';
import './DashboardPage.css';

type TrendRange = 7 | 30;

function toIsoUtcDate(offsetDays: number): string {
  const now = new Date();
  const date = new Date(now.getTime() - offsetDays * 86400000);
  const utcDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return utcDay.toISOString();
}

function averageCompletionRate(rows: DailyFeatureRow[]): number {
  if (rows.length === 0) {
    return 0;
  }
  const total = rows.reduce((sum, row) => sum + row.completionRate, 0);
  return total / rows.length;
}

function averageOverdue(rows: DailyFeatureRow[]): number {
  if (rows.length === 0) {
    return 0;
  }
  const total = rows.reduce((sum, row) => sum + row.overdueCount, 0);
  return total / rows.length;
}

function freshnessLabel(updatedAt: string | undefined): string {
  if (updatedAt === undefined) {
    return 'Processing';
  }
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  if (ageMs <= 24 * 3600000) {
    return 'Up to date';
  }
  if (ageMs <= 48 * 3600000) {
    return 'Processing';
  }
  return 'Delayed';
}

export function DashboardPage(): ReactElement {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [focusSummary, setFocusSummary] = useState<DailyFocusSummary | null>(null);
  const [trendRows, setTrendRows] = useState<DailyFeatureRow[]>([]);
  const [trendRange, setTrendRange] = useState<TrendRange>(7);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [taskFormOpen, setTaskFormOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const load = useCallback((): void => {
    setLoading(true);
    setError(null);
    Promise.all([
      getInsights(),
      getDailyFocusSummary(undefined),
      getDailyFeatures(toIsoUtcDate(trendRange - 1), toIsoUtcDate(0)),
    ])
      .then(([insightsData, focusSummaryData, dailyFeatures]) => {
        setInsights(insightsData);
        setFocusSummary(focusSummaryData);
        setTrendRows(dailyFeatures.rows);
      })
      .catch((err: unknown) => {
        setError(toUiErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [trendRange]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    Promise.all([
      getInsights(),
      getDailyFocusSummary(undefined),
      getDailyFeatures(toIsoUtcDate(trendRange - 1), toIsoUtcDate(0)),
    ])
      .then(([insightsData, focusSummaryData, dailyFeatures]) => {
        setInsights(insightsData);
        setFocusSummary(focusSummaryData);
        setTrendRows(dailyFeatures.rows);
      })
      .catch((err: unknown) => {
        setError(toUiErrorMessage(err));
      })
      .finally(() => setRefreshing(false));
  }, [trendRange]);

  const openCreateTask = useCallback((): void => {
    setTaskFormOpen(true);
  }, []);

  const closeTaskForm = useCallback((): void => {
    setTaskFormOpen(false);
  }, []);

  const onTaskSaved = useCallback((): void => {
    setTaskFormOpen(false);
    load();
    setToastMessage('Task created');
  }, [load]);

  const onRecommendationAction = useCallback(
    (recommendation: InsightsRecommendation): void => {
      const message = recommendation.message.toLowerCase();
      if (recommendation.type.toLowerCase().includes('overdue') || message.includes('overdue')) {
        navigate('/tasks?status=PENDING&sort=dueAt&order=asc');
        return;
      }
      navigate('/tasks?status=PENDING');
    },
    [navigate],
  );

  const hasAnyTask = (insights?.taskSummary.total ?? 0) > 0;
  const hasCompletedFocusSession = (focusSummary?.completedSessionsCount ?? 0) > 0;
  const hasInsightData = insights?.daily !== null && insights?.daily !== undefined;
  const freshness = freshnessLabel(insights?.daily?.updatedAt);

  const onboardingMessage = !hasAnyTask
    ? 'Create your first task to start your workflow.'
    : !hasCompletedFocusSession
      ? 'Start your first focus session from a task to unlock progress tracking.'
      : !hasInsightData
        ? 'Insights are being prepared from your first sessions.'
        : '';


  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <header className="dashboard-header">
          <div className="dashboard-header__top">
            <div>
              <h1 className="dashboard-title">Insights</h1>
              <p className="dashboard-subtitle">Actionable analytics and recommendations</p>
            </div>
            <button
              type="button"
              className="dashboard-refresh"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh dashboard"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <p className="dashboard-subtitle">Insights freshness: {freshness}</p>
        </header>
        {loading ? <section className="onboarding-banner">Loading insights...</section> : null}
        {error !== null ? (
          <section className="onboarding-banner">
            {error}
            <button type="button" className="dashboard-refresh" onClick={load}>
              Retry
            </button>
          </section>
        ) : null}
        {onboardingMessage.length > 0 ? (
          <section className="onboarding-banner">{onboardingMessage}</section>
        ) : null}
        {insights?.segment !== null && insights?.segment !== undefined ? (
          <div className="dashboard-actions">
            <span className="segment-wrap">
              <SegmentBadge segment={insights.segment} />
            </span>
          </div>
        ) : null}
        <section className="overview-section">
          <h2 className="section-title">Overview</h2>
          <SummaryCards summary={insights?.taskSummary ?? null} />
        </section>
        {insights?.daily !== null && insights?.daily !== undefined ? (
          <section className="daily-section">
            <DailyStats daily={insights.daily} />
          </section>
        ) : null}
        <section className="recommendations-section">
          <h2 className="section-title">Recommendations</h2>
          <RecommendationsList
            recommendations={insights?.recommendations ?? []}
            onAction={onRecommendationAction}
          />
        </section>
        <section className="trends-section">
          <div className="trends-header">
            <h2 className="section-title">Trends</h2>
            <div className="trends-range">
              <button
                type="button"
                className={`trend-range-btn ${trendRange === 7 ? 'trend-range-btn--active' : ''}`}
                onClick={() => setTrendRange(7)}
              >
                7D
              </button>
              <button
                type="button"
                className={`trend-range-btn ${trendRange === 30 ? 'trend-range-btn--active' : ''}`}
                onClick={() => setTrendRange(30)}
              >
                30D
              </button>
            </div>
          </div>
          <div className="trend-grid">
            <div className="trend-card">
              <div className="trend-label">Average completion</div>
              <div className="trend-value">{(averageCompletionRate(trendRows) * 100).toFixed(1)}%</div>
            </div>
            <div className="trend-card">
              <div className="trend-label">Average overdue/day</div>
              <div className="trend-value">{averageOverdue(trendRows).toFixed(1)}</div>
            </div>
            <div className="trend-card">
              <div className="trend-label">Focus minutes today</div>
              <div className="trend-value">{focusSummary?.totalMinutes ?? 0}</div>
            </div>
            <div className="trend-card">
              <div className="trend-label">Completed sessions today</div>
              <div className="trend-value">{focusSummary?.completedSessionsCount ?? 0}</div>
            </div>
          </div>
        </section>
      </div>
      <Fab iconName="add" ariaLabel="Add task" onClick={openCreateTask} />
      <Modal isOpen={taskFormOpen} onClose={closeTaskForm}>
        <TaskForm task={null} onClose={closeTaskForm} onSaved={onTaskSaved} />
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
