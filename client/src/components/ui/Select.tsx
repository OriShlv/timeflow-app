import type { ReactElement } from 'react';
import './Select.css';

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectProps = {
  value: string;
  options: SelectOption[];
  placeholder: string | undefined;
  disabled: boolean;
  className: string | undefined;
  onChange: (value: string) => void;
};

export function Select(props: SelectProps): ReactElement {
  const className = props.className !== undefined ? props.className : '';

  return (
    <select
      className={`tf-select ${className}`.trim()}
      value={props.value}
      disabled={props.disabled}
      onChange={(event) => props.onChange(event.target.value)}
    >
      {props.placeholder !== undefined && (
        <option value="" disabled>
          {props.placeholder}
        </option>
      )}
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
