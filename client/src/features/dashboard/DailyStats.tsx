import type { ReactElement } from 'react';
import { Card } from '../../components/ui/Card';
import { formatUtcDate } from '../../lib/dateFormat';
import { useT } from '../../lib/i18n/I18nContext';
import type { InsightsDaily } from '../../lib/types';
import { useUserPreferences } from '../../lib/useUserPreferences';
import './DailyStats.css';

export type DailyStatsProps = {
  daily: InsightsDaily | null;
};

export function DailyStats(props: DailyStatsProps): ReactElement | null {
  const t = useT();
  const { language } = useUserPreferences();

  if (props.daily === null) {
    return null;
  }

  const daily = props.daily;
  const formattedDay = formatUtcDate(daily.day, language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card className="daily-stats">
      <div className="daily-stats__header">{t('insights.dailyStats', { date: formattedDay })}</div>
      <div className="daily-stats__grid">
        <div className="daily-stats__row">
          <span className="daily-stats__label">{t('insights.created')}</span>
          <span>{daily.createdCount}</span>
        </div>
        <div className="daily-stats__row">
          <span className="daily-stats__label">{t('insights.completed')}</span>
          <span>{daily.completedCount}</span>
        </div>
        <div className="daily-stats__row">
          <span className="daily-stats__label">{t('insights.completionRate')}</span>
          <span>{(daily.completionRate * 100).toFixed(1)}%</span>
        </div>
        <div className="daily-stats__row">
          <span className="daily-stats__label">{t('insights.withDueDate')}</span>
          <span>{daily.tasksWithDueAt}</span>
        </div>
        <div className="daily-stats__row">
          <span className="daily-stats__label">{t('insights.overdue')}</span>
          <span>{daily.overdueCount}</span>
        </div>
        <div className="daily-stats__row">
          <span className="daily-stats__label">{t('insights.avgLag')}</span>
          <span>{daily.avgCompletionLagH.toFixed(1)}</span>
        </div>
      </div>
    </Card>
  );
}
