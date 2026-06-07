import type { ReactElement } from 'react';

import { Button } from '../ui';
import { toUiErrorMessage } from '../../lib/apiFeedback';
import { formatElapsedMs, useFocusClock } from '../../lib/focusSessionTime';
import { useFocusSession } from '../../lib/FocusSessionContext';
import './FocusSessionPanel.css';

export type FocusSessionPanelProps = {
  onError: (message: string) => void;
};

export function FocusSessionPanel(props: FocusSessionPanelProps): ReactElement {
  const focus = useFocusSession();
  const startedAt = focus.activeSession?.session.startedAt ?? null;
  const nowMs = useFocusClock(startedAt);

  const onStop = (): void => {
    focus.stopFocus().catch((err: unknown) => {
      props.onError(toUiErrorMessage(err));
    });
  };

  const onCancel = (): void => {
    focus.cancelFocus().catch((err: unknown) => {
      props.onError(toUiErrorMessage(err));
    });
  };

  const onPauseToggle = (): void => {
    if (focus.isPaused) {
      focus.resumeFocus();
      return;
    }
    focus.pauseFocus();
  };

  if (focus.loading) {
    return (
      <section className="focus-session-panel">
        <h3 className="focus-session-panel__title">Focus session</h3>
        <p className="focus-session-panel__idle">Checking focus status…</p>
      </section>
    );
  }

  if (focus.activeSession === null) {
    return (
      <section className="focus-session-panel">
        <h3 className="focus-session-panel__title">Focus session</h3>
        <p className="focus-session-panel__idle">
          No active session. Start focus from a task below or on the Tasks tab.
        </p>
        <div className="focus-session-panel__actions">
          <Button
            type="button"
            fill="outline"
            size="small"
            expand={undefined}
            color="default"
            disabled={focus.loading || focus.actionLoading}
            className={undefined}
            aria-label="Sync focus session status"
            onClick={() => {
              focus.refresh().catch((err: unknown) => {
                props.onError(toUiErrorMessage(err));
              });
            }}
          >
            Sync status
          </Button>
        </div>
      </section>
    );
  }

  const taskLabel = focus.activeSession.taskTitle ?? 'Untitled task';
  const elapsed = formatElapsedMs(focus.getElapsedMs(nowMs));

  return (
    <section
      className={`focus-session-panel focus-session-panel--active ${focus.isPaused ? 'focus-session-panel--paused' : ''}`}
      aria-live="polite"
    >
      <div className="focus-session-panel__header">
        <h3 className="focus-session-panel__title">Focus session</h3>
        <span className="focus-session-panel__badge">{focus.isPaused ? 'Paused' : 'Running'}</span>
      </div>
      <p className="focus-session-panel__task">{taskLabel}</p>
      <p className="focus-session-panel__timer">{elapsed}</p>
      <p className="focus-session-panel__hint">
        Pause to take a break without ending the session. Stop saves your focused time. Cancel discards the session.
      </p>
      <div className="focus-session-panel__actions">
        <Button
          type="button"
          fill="outline"
          size="small"
          expand={undefined}
          color="default"
          disabled={focus.actionLoading}
          className={undefined}
          aria-label={focus.isPaused ? 'Resume focus session' : 'Pause focus session'}
          onClick={onPauseToggle}
        >
          {focus.isPaused ? 'Resume' : 'Pause'}
        </Button>
        {focus.isPaused ? (
          <Button
            type="button"
            fill="outline"
            size="small"
            expand={undefined}
            color="danger"
            disabled={focus.actionLoading}
            className={undefined}
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
          className="focus-session-panel__stop"
          aria-label="Stop focus session and save time"
          onClick={onStop}
        >
          {focus.actionLoading ? 'Stopping…' : 'Stop'}
        </Button>
      </div>
    </section>
  );
}
