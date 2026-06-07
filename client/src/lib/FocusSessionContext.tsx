import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { ApiError } from './apiClient';
import { toUiErrorMessage } from './apiFeedback';
import { computeFocusElapsedMs, type FocusPauseState } from './focusSessionTime';
import {
  getRunningFocusSession,
  startFocusSession,
  stopFocusSession,
  cancelFocusSession,
} from './focusSessionsApi';
import { getTasks } from './tasksApi';
import type { FocusSession } from './types';

export type ActiveFocusSession = {
  session: FocusSession;
  taskTitle: string | null;
};

export type FocusSessionContextValue = {
  activeSession: ActiveFocusSession | null;
  loading: boolean;
  actionLoading: boolean;
  isPaused: boolean;
  pauseState: FocusPauseState;
  refresh: () => Promise<void>;
  startFocus: (taskId: string, taskTitle: string) => Promise<void>;
  pauseFocus: () => void;
  resumeFocus: () => void;
  stopFocus: () => Promise<void>;
  cancelFocus: () => Promise<void>;
  getElapsedMs: (nowMs: number) => number;
  isTaskInFocus: (taskId: string) => boolean;
};

const FocusSessionContext = createContext<FocusSessionContextValue | null>(null);

const emptyPauseState: FocusPauseState = {
  isPaused: false,
  pausedMs: 0,
  pausedAtMs: null,
};

export type FocusSessionProviderProps = {
  children: ReactNode;
};

async function resolveTaskTitle(taskId: string | null): Promise<string | null> {
  if (taskId === null) {
    return null;
  }
  const result = await getTasks({ page: 1, pageSize: 100 });
  const task = result.items.find((item) => item.id === taskId);
  if (task === undefined) {
    return null;
  }
  return task.title;
}

function runningSessionMessage(activeSession: ActiveFocusSession): string {
  const label = activeSession.taskTitle ?? 'another task';
  return `You already have a focus session running on "${label}". Stop it first.`;
}

function isFocusSessionAlreadyRunningError(error: unknown): boolean {
  return error instanceof ApiError && error.message === 'FocusSessionAlreadyRunning';
}

export function FocusSessionProvider(props: FocusSessionProviderProps): ReactElement {
  const [activeSession, setActiveSession] = useState<ActiveFocusSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [pauseState, setPauseState] = useState<FocusPauseState>(emptyPauseState);

  const resetPauseState = useCallback((): void => {
    setPauseState(emptyPauseState);
  }, []);

  const applySession = useCallback((session: FocusSession, taskTitle: string | null): void => {
    setActiveSession({ session, taskTitle });
  }, []);

  const setFromSession = useCallback(
    async (session: FocusSession | null): Promise<void> => {
      if (session === null) {
        setActiveSession(null);
        resetPauseState();
        return;
      }
      applySession(session, null);
      try {
        const taskTitle = await resolveTaskTitle(session.taskId);
        applySession(session, taskTitle);
      } catch {
        applySession(session, null);
      }
    },
    [applySession, resetPauseState],
  );

  const syncRunningSession = useCallback(async (): Promise<FocusSession | null> => {
    const session = await getRunningFocusSession();
    await setFromSession(session);
    return session;
  }, [setFromSession]);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await syncRunningSession();
    } finally {
      setLoading(false);
    }
  }, [syncRunningSession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    resetPauseState();
  }, [activeSession?.session.id, resetPauseState]);

  const resolveSessionForAction = useCallback(async (): Promise<FocusSession | null> => {
    if (activeSession !== null) {
      return activeSession.session;
    }
    return getRunningFocusSession();
  }, [activeSession]);

  const getElapsedMs = useCallback(
    (nowMs: number): number => {
      if (activeSession === null) {
        return 0;
      }
      return computeFocusElapsedMs(activeSession.session.startedAt, nowMs, pauseState);
    },
    [activeSession, pauseState],
  );

  const pauseFocus = useCallback((): void => {
    if (activeSession === null || pauseState.isPaused) {
      return;
    }
    setPauseState({
      isPaused: true,
      pausedMs: pauseState.pausedMs,
      pausedAtMs: Date.now(),
    });
  }, [activeSession, pauseState.isPaused, pauseState.pausedMs]);

  const resumeFocus = useCallback((): void => {
    if (!pauseState.isPaused || pauseState.pausedAtMs === null) {
      return;
    }
    setPauseState({
      isPaused: false,
      pausedMs: pauseState.pausedMs + (Date.now() - pauseState.pausedAtMs),
      pausedAtMs: null,
    });
  }, [pauseState.isPaused, pauseState.pausedAtMs, pauseState.pausedMs]);

  const startFocus = useCallback(
    async (taskId: string, taskTitle: string): Promise<void> => {
      if (activeSession !== null) {
        if (activeSession.session.taskId === taskId) {
          throw new Error('You are already focusing on this task.');
        }
        throw new Error(runningSessionMessage(activeSession));
      }
      setActionLoading(true);
      try {
        const session = await startFocusSession(taskId);
        resetPauseState();
        applySession(session, taskTitle);
      } catch (error: unknown) {
        if (isFocusSessionAlreadyRunningError(error)) {
          await syncRunningSession();
          throw new Error(
            'A focus session is already running on the server. It has been restored — use Stop to save your time.',
          );
        }
        throw new Error(toUiErrorMessage(error));
      } finally {
        setActionLoading(false);
      }
    },
    [activeSession, applySession, resetPauseState, syncRunningSession],
  );

  const stopFocus = useCallback(async (): Promise<void> => {
    setActionLoading(true);
    try {
      const existing = await resolveSessionForAction();
      if (existing === null) {
        setActiveSession(null);
        resetPauseState();
        return;
      }
      const elapsedMs = computeFocusElapsedMs(existing.startedAt, Date.now(), pauseState);
      const endedAt = new Date(new Date(existing.startedAt).getTime() + elapsedMs).toISOString();
      const session = await stopFocusSession(existing.id, endedAt);
      if (session.status === 'RUNNING') {
        await syncRunningSession();
        return;
      }
      setActiveSession(null);
      resetPauseState();
    } catch (error: unknown) {
      throw new Error(toUiErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }, [pauseState, resolveSessionForAction, resetPauseState, syncRunningSession]);

  const cancelFocus = useCallback(async (): Promise<void> => {
    setActionLoading(true);
    try {
      const existing = await resolveSessionForAction();
      if (existing === null) {
        setActiveSession(null);
        resetPauseState();
        return;
      }
      const session = await cancelFocusSession(existing.id, undefined);
      if (session.status === 'RUNNING') {
        await syncRunningSession();
        return;
      }
      setActiveSession(null);
      resetPauseState();
    } catch (error: unknown) {
      throw new Error(toUiErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }, [resolveSessionForAction, resetPauseState, syncRunningSession]);

  const isTaskInFocus = useCallback(
    (taskId: string): boolean => {
      return activeSession?.session.taskId === taskId;
    },
    [activeSession],
  );

  const value = useMemo(
    (): FocusSessionContextValue => ({
      activeSession,
      loading,
      actionLoading,
      isPaused: pauseState.isPaused,
      pauseState,
      refresh,
      startFocus,
      pauseFocus,
      resumeFocus,
      stopFocus,
      cancelFocus,
      getElapsedMs,
      isTaskInFocus,
    }),
    [
      activeSession,
      loading,
      actionLoading,
      pauseState,
      refresh,
      startFocus,
      pauseFocus,
      resumeFocus,
      stopFocus,
      cancelFocus,
      getElapsedMs,
      isTaskInFocus,
    ],
  );

  return <FocusSessionContext.Provider value={value}>{props.children}</FocusSessionContext.Provider>;
}

export function useFocusSession(): FocusSessionContextValue {
  const context = useContext(FocusSessionContext);
  if (context === null) {
    throw new Error('useFocusSession must be used within FocusSessionProvider');
  }
  return context;
}
