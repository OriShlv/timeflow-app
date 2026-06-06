import type { ReactElement } from 'react';
import { Card } from '../../components/ui/Card';
import type { TaskSummary } from '../../lib/types';
import './SummaryCards.css';

export type SummaryCardsProps = {
  summary: TaskSummary | null;
};

export function SummaryCards(props: SummaryCardsProps): ReactElement | null {
  if (props.summary === null) {
    return null;
  }

  const summary = props.summary;

  return (
    <div className="summary-cards">
      <Card className="summary-card">
        <div className="summary-card__header">Total</div>
        <div className="summary-card__value">{summary.total}</div>
      </Card>
      <Card className="summary-card">
        <div className="summary-card__header">Done</div>
        <div className="summary-card__value">{summary.done}</div>
      </Card>
      <Card className="summary-card">
        <div className="summary-card__header">Pending</div>
        <div className="summary-card__value">{summary.pending}</div>
      </Card>
      <Card className="summary-card">
        <div className="summary-card__header">Overdue</div>
        <div className="summary-card__value">{summary.overdue}</div>
      </Card>
      <Card className="summary-card">
        <div className="summary-card__header">Completion rate</div>
        <div className="summary-card__value">{(summary.completionRate * 100).toFixed(1)}%</div>
      </Card>
    </div>
  );
}
