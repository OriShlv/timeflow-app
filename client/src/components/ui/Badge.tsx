import type { ReactElement, ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export type BadgeProps = {
  variant: BadgeVariant;
  className: string | undefined;
  children: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface text-text-muted',
  primary: 'bg-primary-light text-primary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-danger-light text-danger',
};

export function Badge(props: BadgeProps): ReactElement {
  const className = props.className !== undefined ? props.className : '';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-tf-sm px-2 py-0.5 text-xs font-medium',
        variantClasses[props.variant],
        className,
      )}
    >
      {props.children}
    </span>
  );
}
