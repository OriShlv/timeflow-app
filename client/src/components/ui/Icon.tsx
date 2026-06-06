import type { ReactElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, List, Plus, X } from 'lucide-react';

export type IconName = 'add' | 'close' | 'stats-chart-outline' | 'list-outline';

const ICON_MAP: Record<IconName, LucideIcon> = {
  add: Plus,
  close: X,
  'stats-chart-outline': BarChart3,
  'list-outline': List,
};

export type IconProps = {
  name: IconName;
  size: number | undefined;
  className: string | undefined;
  'aria-hidden': boolean | undefined;
};

export function Icon(props: IconProps): ReactElement {
  const LucideComponent = ICON_MAP[props.name];
  const size = props.size !== undefined ? props.size : 20;
  const className = props.className !== undefined ? props.className : '';
  const ariaHidden = props['aria-hidden'] !== undefined ? props['aria-hidden'] : true;

  return (
    <LucideComponent
      size={size}
      className={className}
      aria-hidden={ariaHidden}
    />
  );
}
