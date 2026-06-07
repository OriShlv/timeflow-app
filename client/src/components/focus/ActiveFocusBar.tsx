import { useEffect, useState, type ReactElement } from 'react';

import { Button } from '../ui';
import { toUiErrorMessage } from '../../lib/apiFeedback';
import { formatElapsedMs, useFocusClock } from '../../lib/focusSessionTime';
import { useFocusSession } from '../../lib/FocusSessionContext';
import './ActiveFocusBar.css';

export function ActiveFocusBar(): ReactElement | null {
  const focus = useFocusSession();
  const startedAt = focus.activeSession?.session.startedAt ?? null;
  const nowMs = useFocusClock(startedAt);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setActionError(null);
  }, [focus.activeSession?.session.id]);

  if (focus.activeSession === null) {
    return null;
  }

  const taskLabel = focus.activeSession.taskTitle ?? 'Untitled task';
  const elapsed = formatElapsedMs(focus.getElapsedMs(nowMs));

  const onStop = (): void => {
    setActionError(null);
    focus.stopFocus().catch((err: unknown) => {
      setActionError(toUiErrorMessage(err));
    });
  };

  const onCancel = (): void => {
    setActionError(null);
    focus.cancelFocus().catch((err: unknown) => {
      setActionError(toUiErrorMessage(err));
    });
  };

  const onPauseToggle = (): void => {
    setActionError(null);
    if (focus.isPaused) {
      focus.resumeFocus();
      return;
    }
    focus.pauseFocus();
  };

  return (
    <section
      className={`active-focus-bar ${focus.isPaused ? 'active-focus-bar--paused' : ''}`}
      aria-label="Active focus session"
    >
      <div className="active-focus-bar__content">
        <div className="active-focus-bar__info">
          <span className="active-focus-bar__label">{focus.isPaused ? 'Paused on' : 'Focusing on'}</span>
          <strong className="active-focus-bar__task">{taskLabel}</strong>
          <span className="active-focus-bar__timer" aria-live="polite">
            {elapsed}
          </span>
          {actionError !== null ? (
            <span className="active-focus-bar__error">{actionError}</span>
          ) : null}
        </div>
        <div className="active-focus-bar__actions">
          <Button
            type="button"
            fill="clear"
            size="small"
            expand={undefined}
            color="default"
            disabled={focus.actionLoading}
            className="active-focus-bar__pause"
            aria-label={focus.isPaused ? 'Resume focus session' : 'Pause focus session'}
            onClick={onPauseToggle}
          >
            {focus.isPaused ? 'Resume' : 'Pause'}
          </Button>
          {focus.isPaused ? (
            <Button
              type="button"
              fill="clear"
              size="small"
              expand={undefined}
              color="danger"
              disabled={focus.actionLoading}
              className="active-focus-bar__cancel"
              aria-label="Cancel focus session without saving time"
              onClick={onCancel}
            >
              {focus.actionLoading ? 'Canceling…' : 'Cancel'}
            </Button>
          ) : null}
          <Button
            type="button"
            fill="solid"
            size="small"
            expand={undefined}
            color="default"
            disabled={focus.actionLoading}
            className="active-focus-bar__stop"
            aria-label="Stop focus session and save time"
            onClick={onStop}
          >
            {focus.actionLoading ? 'Stopping…' : 'Stop'}
          </Button>
        </div>
      </div>
    </section>
  );
}
