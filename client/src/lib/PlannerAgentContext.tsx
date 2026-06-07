import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { PlannerIntent } from './plannerAgentTypes';

export type OpenPlannerOptions = {
  intent: PlannerIntent | undefined;
  taskId: string | undefined;
  taskTitle: string | undefined;
};

type PendingPlannerAction = {
  intent: PlannerIntent;
  taskId: string | undefined;
  taskTitle: string | undefined;
};

type PlannerView = 'closed' | 'expanded' | 'minimized';

type PlannerAgentContextValue = {
  isSessionActive: boolean;
  isExpanded: boolean;
  isMinimized: boolean;
  hasUnreadResponse: boolean;
  contextTaskId: string | undefined;
  contextTaskTitle: string | undefined;
  pendingAction: PendingPlannerAction | null;
  openPopup: (options: OpenPlannerOptions | undefined) => void;
  expandPopup: () => void;
  minimizePopup: () => void;
  closePopup: () => void;
  clearPendingAction: () => void;
  markResponseReady: () => void;
  setContextTaskId: (taskId: string | undefined) => void;
  setContextTask: (taskId: string | undefined, taskTitle: string | undefined) => void;
};

const PlannerAgentContext = createContext<PlannerAgentContextValue | null>(null);

export type PlannerAgentProviderProps = {
  children: ReactNode;
};

export function PlannerAgentProvider(props: PlannerAgentProviderProps): ReactElement {
  const [view, setView] = useState<PlannerView>('closed');
  const [hasUnreadResponse, setHasUnreadResponse] = useState<boolean>(false);
  const [contextTaskId, setContextTaskIdState] = useState<string | undefined>(undefined);
  const [contextTaskTitle, setContextTaskTitleState] = useState<string | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingPlannerAction | null>(null);

  const openPopup = useCallback((options: OpenPlannerOptions | undefined): void => {
    if (options?.taskId !== undefined) {
      setContextTaskIdState(options.taskId);
    }
    if (options?.taskTitle !== undefined) {
      setContextTaskTitleState(options.taskTitle);
    }
    if (options?.intent !== undefined) {
      setPendingAction({
        intent: options.intent,
        taskId: options.taskId,
        taskTitle: options.taskTitle,
      });
    }
    setHasUnreadResponse(false);
    setView('expanded');
  }, []);

  const expandPopup = useCallback((): void => {
    setHasUnreadResponse(false);
    setView('expanded');
  }, []);

  const minimizePopup = useCallback((): void => {
    setView((current) => (current === 'expanded' ? 'minimized' : current));
  }, []);

  const closePopup = useCallback((): void => {
    setView('closed');
    setHasUnreadResponse(false);
    setPendingAction(null);
    setContextTaskIdState(undefined);
    setContextTaskTitleState(undefined);
  }, []);

  const clearPendingAction = useCallback((): void => {
    setPendingAction(null);
  }, []);

  const markResponseReady = useCallback((): void => {
    setHasUnreadResponse(true);
  }, []);

  const setContextTaskId = useCallback((taskId: string | undefined): void => {
    setContextTaskIdState(taskId);
  }, []);

  const setContextTask = useCallback((taskId: string | undefined, taskTitle: string | undefined): void => {
    setContextTaskIdState(taskId);
    setContextTaskTitleState(taskTitle);
  }, []);

  const value = useMemo(
    (): PlannerAgentContextValue => ({
      isSessionActive: view !== 'closed',
      isExpanded: view === 'expanded',
      isMinimized: view === 'minimized',
      hasUnreadResponse,
      contextTaskId,
      contextTaskTitle,
      pendingAction,
      openPopup,
      expandPopup,
      minimizePopup,
      closePopup,
      clearPendingAction,
      markResponseReady,
      setContextTaskId,
      setContextTask,
    }),
    [
      view,
      hasUnreadResponse,
      contextTaskId,
      contextTaskTitle,
      pendingAction,
      openPopup,
      expandPopup,
      minimizePopup,
      closePopup,
      clearPendingAction,
      markResponseReady,
      setContextTaskId,
      setContextTask,
    ],
  );

  return <PlannerAgentContext.Provider value={value}>{props.children}</PlannerAgentContext.Provider>;
}

export function usePlannerAgent(): PlannerAgentContextValue {
  const ctx = useContext(PlannerAgentContext);
  if (ctx === null) {
    throw new Error('usePlannerAgent must be used within PlannerAgentProvider');
  }
  return ctx;
}
