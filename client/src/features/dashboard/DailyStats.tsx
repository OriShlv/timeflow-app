import type { ReactElement } from 'react';
import { Card } from '../../components/ui/Card';
import type { InsightsDaily } from '../../lib/types';
import './DailyStats.css';

export type DailyStatsProps = {
  daily: InsightsDaily | null;
};

function formatDay(day: string): string {
  return new Date(day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function DailyStats(props: DailyStatsProps): ReactElement | null {
  if (props.daily === null) {
    return null;
  }

  const daily = props.daily;

  return (
    <Card className="daily-stats">
      <div className="daily-stats__header">Daily stats ({formatDay(daily.day)})</div>
      <div className="daily-stats__grid">
        <div className="daily-stats__row">
          <span className="daily-stats__label">Created</span>
          <span>{daily.createdCount}</span>
        </div>
        <div className="daily-stats__row">
          <span className="daily-stats__label">Completed</span>
          <span>{daily.completedCount}</span>
        </div>
        <div className="daily-stats__row">
          <span className="daily-stats__label">Completion rate</span>
          <span>{(daily.completionRate * 100).toFixed(1)}%</span>
        </div>
        <div className="daily-stats__row">
          <span className="daily-stats__label">With due date</span>
          <span>{daily.tasksWithDueAt}</span>
        </div>
        <div className="daily-stats__row">
          <span className="daily-stats__label">Overdue</span>
          <span>{daily.overdueCount}</span>
        </div>
        <div className="daily-stats__row">
          <span className="daily-stats__label">Avg completion lag (h)</span>
          <span>{daily.avgCompletionLagH.toFixed(1)}</span>
        </div>
      </div>
    </Card>
  );
}
