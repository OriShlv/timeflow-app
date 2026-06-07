import type { ReactElement, ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type ButtonFill = 'solid' | 'outline' | 'clear';
export type ButtonSize = 'small' | 'default';
export type ButtonExpand = 'block' | undefined;
export type ButtonColor = 'default' | 'danger';

export type ButtonProps = {
  type: 'button' | 'submit' | 'reset';
  fill: ButtonFill;
  size: ButtonSize;
  expand: ButtonExpand;
  color: ButtonColor;
  disabled: boolean;
  className: string | undefined;
  onClick: (() => void) | undefined;
  children: ReactNode;
  'aria-label': string | undefined;
};

const fillClasses: Record<ButtonFill, string> = {
  solid:
    'border-none bg-primary text-white hover:bg-primary-hover disabled:hover:bg-primary',
  outline:
    'border border-border bg-card text-text hover:bg-primary-light hover:border-primary hover:text-primary',
  clear:
    'border-none bg-transparent text-text-muted hover:bg-primary-light hover:text-primary px-3 py-1.5 font-medium',
};

export function Button(props: ButtonProps): ReactElement {
  const fill = props.fill;
  const size = props.size;
  const expand = props.expand;
  const color = props.color;
  const className = props.className !== undefined ? props.className : '';
  const ariaLabel = props['aria-label'];

  const classes = cn(
    'inline-flex items-center justify-center gap-1.5 rounded-tf-sm font-sans text-[0.9375rem] font-semibold leading-tight cursor-pointer transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
    fill === 'clear' ? '' : 'px-5 py-3',
    fillClasses[fill],
    size === 'small' && 'px-3 py-1.5 text-[0.8125rem] font-medium',
    expand === 'block' && 'flex w-full py-4',
    color === 'danger' &&
      fill === 'clear' &&
      'text-danger hover:bg-danger-light hover:text-danger',
    className,
  );

  return (
    <button
      type={props.type}
      className={classes}
      disabled={props.disabled}
      onClick={props.onClick}
      aria-label={ariaLabel}
    >
      {props.children}
    </button>
  );
}
