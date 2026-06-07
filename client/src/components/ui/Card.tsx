import type { ReactElement, ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type CardProps = {
  className: string | undefined;
  children: ReactNode;
};

export function Card(props: CardProps): ReactElement {
  const className = props.className !== undefined ? props.className : '';

  return (
    <div
      className={cn(
        'rounded-tf border border-border bg-card text-text shadow-tf-card [color-scheme:light]',
        className,
      )}
    >
      {props.children}
    </div>
  );
}
