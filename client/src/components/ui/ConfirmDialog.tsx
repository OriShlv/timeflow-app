import type { ReactElement } from 'react';
import { Button } from './Button';
import './ConfirmDialog.css';

export type ConfirmDialogButtonRole = 'cancel' | 'destructive' | 'confirm';

export type ConfirmDialogButton = {
  text: string;
  role: ConfirmDialogButtonRole;
};

export type ConfirmDialogProps = {
  isOpen: boolean;
  header: string;
  message: string;
  buttons: ConfirmDialogButton[];
  onDismiss: (role: ConfirmDialogButtonRole | 'backdrop') => void;
};

export function ConfirmDialog(props: ConfirmDialogProps): ReactElement | null {
  if (!props.isOpen) {
    return null;
  }

  const handleBackdrop = (): void => {
    props.onDismiss('backdrop');
  };

  return (
    <div className="tf-confirm" role="alertdialog" aria-modal="true" aria-labelledby="tf-confirm-header">
      <button
        type="button"
        className="tf-confirm__backdrop"
        aria-label="Dismiss dialog"
        onClick={handleBackdrop}
      />
      <div className="tf-confirm__panel">
        <h2 id="tf-confirm-header" className="tf-confirm__header">
          {props.header}
        </h2>
        <p className="tf-confirm__message">{props.message}</p>
        <div className="tf-confirm__actions">
          {props.buttons.map((button) => {
            const fill = button.role === 'cancel' ? 'outline' : 'solid';
            const color = button.role === 'destructive' ? 'danger' : 'default';

            return (
              <Button
                key={button.text}
                type="button"
                fill={fill}
                size="default"
                expand={undefined}
                color={color}
                disabled={false}
                className={undefined}
                aria-label={undefined}
                onClick={() => props.onDismiss(button.role)}
              >
                {button.text}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
