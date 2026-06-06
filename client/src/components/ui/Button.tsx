import type { ReactElement, ReactNode } from 'react';
import './Button.css';

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

export function Button(props: ButtonProps): ReactElement {
  const fill = props.fill;
  const size = props.size;
  const expand = props.expand;
  const color = props.color;
  const className = props.className !== undefined ? props.className : '';
  const ariaLabel = props['aria-label'];

  const classes = [
    'tf-button',
    `tf-button--${fill}`,
    size === 'small' ? 'tf-button--small' : '',
    expand === 'block' ? 'tf-button--block' : '',
    color === 'danger' ? 'tf-button--danger' : '',
    className,
  ]
    .filter((c) => c.length > 0)
    .join(' ');

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
