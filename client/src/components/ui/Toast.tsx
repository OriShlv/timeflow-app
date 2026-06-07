import { useEffect, type ReactElement } from 'react';

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
    <div
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 z-[90] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-tf-sm bg-text px-5 py-3 text-sm font-medium text-white shadow-tf-card"
      role="status"
      aria-live="polite"
    >
      {props.message}
    </div>
  );
}
