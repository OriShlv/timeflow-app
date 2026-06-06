import { useEffect, type ReactElement, type ReactNode } from 'react';
import './Modal.css';

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
    <div className="tf-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="tf-modal__backdrop"
        aria-label="Close modal"
        onClick={props.onClose}
      />
      <div className="tf-modal__panel">{props.children}</div>
    </div>
  );
}
