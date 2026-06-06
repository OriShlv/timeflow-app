import { useEffect, type ReactElement } from 'react';
import './Toast.css';

export type ToastProps = {
  isOpen: boolean;
  message: string;
  durationMs: number;
  onDismiss: () => void;
};

export function Toast(props: ToastProps): ReactElement | null {
  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      props.onDismiss();
    }, props.durationMs);

    return () => window.clearTimeout(timer);
  }, [props.isOpen, props.message, props.durationMs, props.onDismiss]);

  if (!props.isOpen || props.message.length === 0) {
    return null;
  }

  return (
    <div className="tf-toast" role="status" aria-live="polite">
      {props.message}
    </div>
  );
}
