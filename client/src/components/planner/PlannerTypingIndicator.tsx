import type { ReactElement } from 'react';

import { cn } from '../../lib/cn';

type DotProps = {
  className: string | undefined;
};

function Dot(props: DotProps): ReactElement {
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full bg-text-muted animate-pulse', props.className)}
      aria-hidden={true}
    />
  );
}

export function PlannerTypingIndicator(): ReactElement {
  return (
    <span className="inline-flex items-center gap-1 py-0.5" role="status" aria-label="Thinking">
      <Dot className={undefined} />
      <Dot className="[animation-delay:0.2s]" />
      <Dot className="[animation-delay:0.4s]" />
    </span>
  );
}
