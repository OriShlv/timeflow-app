import type { ReactElement } from 'react';

import { Card } from '../../components/ui/Card';
import { usePlannerAgent } from '../../lib/PlannerAgentContext';
import './AgentPlaceholder.css';

export function AgentPlaceholder(): ReactElement {
  const planner = usePlannerAgent();

  return (
    <section className="agent-placeholder" aria-label="AI planner assistant">
      <Card className="agent-placeholder__card">
        <h2 className="agent-placeholder__title">Planner</h2>
        <p className="agent-placeholder__text">
          Review deadlines, split large tasks, and get a draft schedule for your day.
        </p>
        <button type="button" className="agent-placeholder__cta" onClick={() => planner.openPopup(undefined)}>
          Open planner
        </button>
      </Card>
    </section>
  );
}
