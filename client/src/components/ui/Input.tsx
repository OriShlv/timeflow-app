import type { ReactElement } from 'react';
import './Input.css';

export type InputProps = {
  id: string | undefined;
  type: string;
  value: string;
  placeholder: string | undefined;
  disabled: boolean;
  autoComplete: string | undefined;
  className: string | undefined;
  onChange: (value: string) => void;
  onBlur: (() => void) | undefined;
};

export function Input(props: InputProps): ReactElement {
  const className = props.className !== undefined ? props.className : '';

  return (
    <div className={`tf-input-wrap ${className}`.trim()}>
      <input
        id={props.id}
        className="tf-input"
        type={props.type}
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        autoComplete={props.autoComplete}
        onChange={(event) => props.onChange(event.target.value)}
        onBlur={props.onBlur}
      />
    </div>
  );
}
