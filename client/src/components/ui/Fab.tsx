import type { ReactElement } from 'react';
import { Icon, type IconName } from './Icon';
import './Fab.css';

export type FabProps = {
  iconName: IconName;
  ariaLabel: string;
  onClick: () => void;
};

export function Fab(props: FabProps): ReactElement {
  return (
    <div className="tf-fab">
      <button
        type="button"
        className="tf-fab__button"
        aria-label={props.ariaLabel}
        onClick={props.onClick}
      >
        <Icon name={props.iconName} size={24} className={undefined} aria-hidden={true} />
      </button>
    </div>
  );
}
