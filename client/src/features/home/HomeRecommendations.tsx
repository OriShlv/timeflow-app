import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card } from '../../components/ui/Card';
import type { InsightsRecommendation } from '../../lib/types';
import './HomeRecommendations.css';

export type HomeRecommendationsProps = {
  recommendations: InsightsRecommendation[];
};

function recommendationActionPath(recommendation: InsightsRecommendation): string {
  const message = recommendation.message.toLowerCase();
  if (recommendation.type.toLowerCase().includes('overdue') || message.includes('overdue')) {
    return '/tasks?status=PENDING&sort=dueAt&order=asc';
  }
  return '/tasks?status=PENDING';
}

export function HomeRecommendations(props: HomeRecommendationsProps): ReactElement {
  const navigate = useNavigate();
  const recommendations = props.recommendations;
  const top = recommendations[0] ?? null;

  return (
    <section className="home-recommendations" aria-label="Recommendations">
      <Card className="home-recommendations__card">
        <div className="home-recommendations__header">
          <h2 className="home-recommendations__title">Recommendations</h2>
          <span className="home-recommendations__count">{recommendations.length} active</span>
        </div>
        {top === null ? (
          <p className="home-recommendations__empty">
            No recommendations yet. Keep using Timeflow and insights will appear here.
          </p>
        ) : (
          <>
            <p className="home-recommendations__message">{top.message}</p>
            <p className="home-recommendations__type">{top.type.replace(/_/g, ' ').toLowerCase()}</p>
          </>
        )}
        <div className="home-recommendations__actions">
          {top !== null ? (
            <button
              type="button"
              className="home-recommendations__btn home-recommendations__btn--primary"
              onClick={() => navigate(recommendationActionPath(top))}
            >
              Open related tasks
            </button>
          ) : null}
          <button
            type="button"
            className="home-recommendations__btn"
            onClick={() => navigate('/insights')}
          >
            View all insights
          </button>
        </div>
      </Card>
    </section>
  );
}
