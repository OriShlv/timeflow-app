import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { Fab, Modal, Toast } from '../components/ui';
import { DailyStats } from '../features/dashboard/DailyStats';
import { RecommendationsList } from '../features/dashboard/RecommendationsList';
import { SegmentBadge } from '../features/dashboard/SegmentBadge';
import { SummaryCards } from '../features/dashboard/SummaryCards';
import { TaskForm } from '../features/tasks/TaskForm';
import { getInsights } from '../lib/insightsApi';
import type { Insights } from '../lib/types';
import './DashboardPage.css';

export function DashboardPage(): ReactElement {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [taskFormOpen, setTaskFormOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const load = useCallback((): void => {
    getInsights()
      .then((data) => setInsights(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    getInsights()
      .then((data) => setInsights(data))
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, []);

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


  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <header className="dashboard-header">
          <div className="dashboard-header__top">
            <div>
              <h1 className="dashboard-title">Dashboard</h1>
              <p className="dashboard-subtitle">Your task overview</p>
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
        </header>
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
          <RecommendationsList recommendations={insights?.recommendations ?? []} />
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
