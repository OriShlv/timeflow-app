import type { ReactElement } from 'react';

import { Icon } from '../ui';
import { usePlannerAgent } from '../../lib/PlannerAgentContext';
import { cn } from '../../lib/cn';
import './PlannerAgentLauncher.css';

export function PlannerAgentLauncher(): ReactElement {
  const planner = usePlannerAgent();

  const onLauncherClick = (): void => {
    if (planner.isMinimized || planner.hasUnreadResponse) {
      planner.expandPopup();
      return;
    }
    if (planner.isExpanded) {
      planner.minimizePopup();
      return;
    }
    planner.openPopup(undefined);
  };

  return (
    <div className="tf-planner-launcher">
      <button
        type="button"
        className={cn(
          'tf-planner-launcher__button',
          planner.hasUnreadResponse ? 'tf-planner-launcher__button--notify' : undefined,
        )}
        aria-label={
          planner.hasUnreadResponse
            ? 'Open planner — new response'
            : planner.isExpanded
              ? 'Minimize AI planner'
              : 'Open AI planner'
        }
        aria-expanded={planner.isExpanded}
        onClick={onLauncherClick}
      >
        <Icon name="sparkles" size={22} className={undefined} aria-hidden={true} />
        {planner.hasUnreadResponse ? (
          <>
            <span className="tf-planner-launcher__ping" aria-hidden={true} />
            <span className="tf-planner-launcher__badge" aria-hidden={true}>
              1
            </span>
          </>
        ) : null}
      </button>
    </div>
  );
}
