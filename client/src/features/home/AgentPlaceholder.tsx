import type { ReactElement } from 'react';

import { Card } from '../../components/ui/Card';
import './AgentPlaceholder.css';

export function AgentPlaceholder(): ReactElement {
  return (
    <section className="agent-placeholder" aria-label="AI assistant coming soon">
      <Card className="agent-placeholder__card">
        <div className="agent-placeholder__badge">Coming soon</div>
        <h2 className="agent-placeholder__title">Scheduling Agent</h2>
        <p className="agent-placeholder__text">
          Your personal AI assistant will review deadlines, suggest focus blocks, and help plan each day.
        </p>
        <button type="button" className="agent-placeholder__cta" disabled aria-disabled="true">
          Start chat
        </button>
      </Card>
    </section>
  );
}
