import type { ReactElement } from 'react';
import './Textarea.css';

export type TextareaProps = {
  id: string | undefined;
  value: string;
  placeholder: string | undefined;
  rows: number;
  disabled: boolean;
  className: string | undefined;
  onChange: (value: string) => void;
};

export function Textarea(props: TextareaProps): ReactElement {
  const className = props.className !== undefined ? props.className : '';

  return (
    <div className={`tf-textarea-wrap ${className}`.trim()}>
      <textarea
        id={props.id}
        className="tf-textarea"
        value={props.value}
        placeholder={props.placeholder}
        rows={props.rows}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}
