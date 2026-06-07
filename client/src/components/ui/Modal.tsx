import { useEffect, type ReactElement, type ReactNode } from 'react';

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal(props: ModalProps): ReactElement | null {

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        props.onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [props.isOpen, props.onClose]);

  if (!props.isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-none bg-text/40 p-0"
        aria-label="Close modal"
        onClick={props.onClose}
      />
      <div
        className="relative z-[1] flex max-h-[92dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-tf bg-surface shadow-tf-card sm:max-h-[85dvh] sm:rounded-tf"
      >
        {props.children}
      </div>
    </div>
  );
}
