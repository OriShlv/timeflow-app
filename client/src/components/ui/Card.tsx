import type { ReactElement, ReactNode } from 'react';
import './Card.css';

export type CardProps = {
  className: string | undefined;
  children: ReactNode;
};

export function Card(props: CardProps): ReactElement {
  const className = props.className !== undefined ? props.className : '';

  return <div className={`tf-card ${className}`.trim()}>{props.children}</div>;
}
