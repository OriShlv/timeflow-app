import type { ReactElement } from 'react';

import { cn } from '../../lib/cn';

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
    <div className={cn('rounded-tf-sm border border-border bg-input-bg', className)}>
      <input
        id={props.id}
        className="block w-full box-border rounded-tf-sm border-none bg-transparent px-4 py-3 font-sans text-base leading-snug text-text placeholder:text-text-muted focus:outline-2 focus:outline-primary-light focus:-outline-offset-1 disabled:opacity-60 disabled:cursor-not-allowed"
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
