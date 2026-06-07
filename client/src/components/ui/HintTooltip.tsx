import { useId, type ReactElement } from 'react';

import './HintTooltip.css';

export type HintTooltipProps = {
  label: string;
  text: string;
};

export function HintTooltip(props: HintTooltipProps): ReactElement {
  const tooltipId = useId();

  return (
    <span className="hint-tooltip">
      <button
        type="button"
        className="hint-tooltip__trigger"
        aria-label={`About ${props.label}`}
        aria-describedby={tooltipId}
      >
        ?
      </button>
      <span id={tooltipId} className="hint-tooltip__content" role="tooltip">
        {props.text}
      </span>
    </span>
  );
}
