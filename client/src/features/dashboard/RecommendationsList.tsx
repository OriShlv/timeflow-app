import type { ReactElement } from 'react';
import type { InsightsRecommendation } from '../../lib/types';
import './RecommendationsList.css';

export type RecommendationsListProps = {
  recommendations: InsightsRecommendation[];
  onAction: (rec: InsightsRecommendation) => void;
};

function formatEvidence(evidence: unknown): string {
  if (typeof evidence === 'string') {
    return evidence;
  }
  if (evidence === null || evidence === undefined) {
    return '';
  }
  if (typeof evidence !== 'object') {
    return '';
  }
  const record = evidence as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof record.overdueCount === 'number') {
    parts.push(`Overdue tasks: ${record.overdueCount}`);
  }
  if (typeof record.completionRate7d === 'number') {
    parts.push(`7-day completion: ${(record.completionRate7d * 100).toFixed(1)}%`);
  }
  if (typeof record.createdCount7d === 'number' && typeof record.completedCount7d === 'number') {
    parts.push(`Created vs completed (7d): ${record.createdCount7d}/${record.completedCount7d}`);
  }
  if (parts.length > 0) {
    return parts.join(' • ');
  }
  return 'Evidence available';
}

function scoreLabel(score: number): string {
  if (score >= 0.75) {
    return 'High';
  }
  if (score >= 0.45) {
    return 'Medium';
  }
  return 'Low';
}

export function RecommendationsList(props: RecommendationsListProps): ReactElement {
  const recommendations = props.recommendations;

  return (
    <div className="recommendations-card">
      {recommendations.length === 0 ? (
        <p className="rec-empty">No recommendations yet.</p>
      ) : (
        recommendations.map((rec) => (
          <div key={rec.id} className="rec-item">
            <p className="rec-message">{rec.message}</p>
            <p className="rec-confidence">Confidence: {scoreLabel(rec.score)}</p>
            {rec.evidence !== null && rec.evidence !== undefined ? (
              <p className="rec-evidence">{formatEvidence(rec.evidence)}</p>
            ) : null}
            <button type="button" className="rec-action" onClick={() => props.onAction(rec)}>
              Open related tasks
            </button>
          </div>
        ))
      )}
    </div>
  );
}
