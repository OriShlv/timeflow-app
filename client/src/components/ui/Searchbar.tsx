import { useEffect, useState, type ReactElement } from 'react';
import './Searchbar.css';

export type SearchbarProps = {
  value: string;
  placeholder: string | undefined;
  debounceMs: number;
  className: string | undefined;
  onChange: (value: string) => void;
};

export function Searchbar(props: SearchbarProps): ReactElement {
  const className = props.className !== undefined ? props.className : '';
  const placeholder = props.placeholder !== undefined ? props.placeholder : 'Search';
  const [localValue, setLocalValue] = useState<string>(props.value);

  useEffect(() => {
    setLocalValue(props.value);
  }, [props.value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localValue !== props.value) {
        props.onChange(localValue);
      }
    }, props.debounceMs);

    return () => window.clearTimeout(timer);
  }, [localValue, props.debounceMs, props.onChange, props.value]);

  return (
    <div className={`tf-searchbar ${className}`.trim()}>
      <input
        className="tf-searchbar__input"
        type="search"
        value={localValue}
        placeholder={placeholder}
        onChange={(event) => setLocalValue(event.target.value)}
      />
    </div>
  );
}
