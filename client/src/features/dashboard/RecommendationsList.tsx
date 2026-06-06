import type { ReactElement } from 'react';
import type { InsightsRecommendation } from '../../lib/types';
import './RecommendationsList.css';

export type RecommendationsListProps = {
  recommendations: InsightsRecommendation[];
};

function formatEvidence(evidence: unknown): string {
  if (typeof evidence === 'string') {
    return evidence;
  }
  if (evidence !== null && typeof evidence === 'object') {
    return JSON.stringify(evidence);
  }
  return '';
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
            {rec.evidence !== null && rec.evidence !== undefined ? (
              <p className="rec-evidence">{formatEvidence(rec.evidence)}</p>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
