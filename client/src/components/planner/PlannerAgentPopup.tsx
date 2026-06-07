import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, ConfirmDialog, Icon } from '../ui';
import { toUiErrorMessage } from '../../lib/apiFeedback';
import { useFocusSession } from '../../lib/FocusSessionContext';
import { usePlannerAgent } from '../../lib/PlannerAgentContext';
import { sendPlannerMessage } from '../../lib/plannerAgentApi';
import { playPlannerNotificationSound, playPlannerPopSound } from '../../lib/plannerSounds';
import type {
  PlannerChatMessage,
  PlannerChatResponse,
  PlannerCreateSubtasksAction,
  PlannerIntent,
  PlannerProposeDraftSubtasksAction,
} from '../../lib/plannerAgentTypes';
import {
  appendPlannerMessages,
  createPlannerCloseWarningMessage,
  createPlannerWelcomeMessage,
  PLANNER_INACTIVITY_MS,
  PLANNER_QUICK_INTENT_OPTIONS,
} from '../../lib/plannerSession';
import { createTask, getTasks } from '../../lib/tasksApi';
import { notifyTasksRefresh } from '../../lib/tasksRefresh';
import type { Task } from '../../lib/types';
import { cn } from '../../lib/cn';
import { PlannerAgentActionCard } from './PlannerAgentActionCard';
import { PlannerTypingIndicator } from './PlannerTypingIndicator';
import './PlannerAgentPopup.css';

function createMessageId(): string {
  return `planner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function splitInitialIdempotencyKey(taskId: string): string {
  return `split:${taskId}:initial`;
}

type SplitPickPhase = 'idle' | 'choose_task';

function findTaskByTitle(tasks: Task[], input: string): Task | undefined {
  const normalized = input.trim().toLowerCase();
  if (normalized.length === 0) {
    return undefined;
  }
  return tasks.find((task) => task.title.trim().toLowerCase() === normalized);
}

function userLabelForIntent(intent: PlannerIntent, taskTitle: string | undefined): string {
  if (intent === 'plan_day') {
    return 'Plan my day';
  }
  if (intent === 'split_task') {
    if (taskTitle !== undefined && taskTitle.trim().length > 0) {
      return `How can I split the task of "${taskTitle.trim()}" into smaller subtasks?`;
    }
    return 'How can I split a task into smaller subtasks?';
  }
  if (intent === 'next_action') {
    return 'What should I do next?';
  }
  return '';
}

export function PlannerAgentPopup(): ReactElement | null {
  const planner = usePlannerAgent();
  const focus = useFocusSession();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<PlannerChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [applyingActionId, setApplyingActionId] = useState<string | null>(null);
  const [startingFocusTaskId, setStartingFocusTaskId] = useState<string | null>(null);
  const [confirmSubtasks, setConfirmSubtasks] = useState<PlannerCreateSubtasksAction | null>(null);
  const [awaitingSplitClarification, setAwaitingSplitClarification] = useState<boolean>(false);
  const [responseFlash, setResponseFlash] = useState<boolean>(false);
  const [splitPickPhase, setSplitPickPhase] = useState<SplitPickPhase>('idle');
  const [splitPickTasks, setSplitPickTasks] = useState<Task[]>([]);
  const [draftSplitTitle, setDraftSplitTitle] = useState<string | undefined>(undefined);
  const sendGenerationRef = useRef<number>(0);
  const idempotentInFlightRef = useRef<Map<string, Promise<PlannerChatResponse>>>(new Map());
  const plannerRef = useRef(planner);
  const welcomeInjectedRef = useRef<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeWarningShownRef = useRef<boolean>(false);

  plannerRef.current = planner;

  const signalAssistantResponse = useCallback((): void => {
    playPlannerNotificationSound();
    const current = plannerRef.current;
    if (!current.isExpanded) {
      current.markResponseReady();
      return;
    }
    setResponseFlash(true);
  }, []);

  const clearInactivityTimer = useCallback((): void => {
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const showCloseWarning = useCallback((): void => {
    if (closeWarningShownRef.current || !plannerRef.current.isSessionActive) {
      return;
    }
    closeWarningShownRef.current = true;
    setMessages((prev) =>
      appendPlannerMessages(prev, createPlannerCloseWarningMessage(createMessageId())),
    );
    signalAssistantResponse();
  }, [signalAssistantResponse]);

  const scheduleInactivityTimer = useCallback((): void => {
    clearInactivityTimer();
    if (!plannerRef.current.isSessionActive || closeWarningShownRef.current) {
      return;
    }
    inactivityTimerRef.current = window.setTimeout(() => {
      inactivityTimerRef.current = null;
      showCloseWarning();
    }, PLANNER_INACTIVITY_MS);
  }, [clearInactivityTimer, showCloseWarning]);

  const recordUserActivity = useCallback((): void => {
    closeWarningShownRef.current = false;
    scheduleInactivityTimer();
  }, [scheduleInactivityTimer]);

  useEffect(() => {
    if (planner.isSessionActive) {
      scheduleInactivityTimer();
      return;
    }
    clearInactivityTimer();
    closeWarningShownRef.current = false;
    welcomeInjectedRef.current = false;
    sendGenerationRef.current += 1;
    setLoading(false);
    setMessages([]);
    setInput('');
    setError(null);
    setAwaitingSplitClarification(false);
    setResponseFlash(false);
    setSplitPickPhase('idle');
    setSplitPickTasks([]);
    setDraftSplitTitle(undefined);
    setStartingFocusTaskId(null);
  }, [planner.isSessionActive, clearInactivityTimer, scheduleInactivityTimer]);

  useEffect(() => {
    if (!responseFlash) {
      return;
    }
    const timer = window.setTimeout(() => setResponseFlash(false), 900);
    return () => window.clearTimeout(timer);
  }, [responseFlash]);

  useLayoutEffect(() => {
    if (!planner.isExpanded) {
      return;
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
  }, [messages, planner.isExpanded]);

  useLayoutEffect(() => {
    if (
      !planner.isExpanded ||
      loading ||
      planner.pendingAction !== null ||
      messages.length > 0 ||
      welcomeInjectedRef.current
    ) {
      return;
    }
    welcomeInjectedRef.current = true;
    setMessages([createPlannerWelcomeMessage(createMessageId())]);
    scheduleInactivityTimer();
  }, [planner.isExpanded, planner.pendingAction, loading, messages.length, scheduleInactivityTimer]);

  const appendAssistant = useCallback((content: string, actions: PlannerChatMessage['actions']): void => {
    setMessages((prev) =>
      appendPlannerMessages(prev, {
        id: createMessageId(),
        role: 'assistant',
        content,
        actions,
        pending: false,
      }),
    );
    signalAssistantResponse();
    scheduleInactivityTimer();
  }, [signalAssistantResponse, scheduleInactivityTimer]);

  const applyAssistantResponse = useCallback(
    (pendingId: string, response: PlannerChatResponse): void => {
      setAwaitingSplitClarification(response.needsClarification === true);
      setMessages((prev) =>
        appendPlannerMessages(
          prev.filter((msg) => msg.id !== pendingId),
          {
            id: createMessageId(),
            role: 'assistant',
            content: response.message,
            actions: response.actions,
            pending: false,
          },
        ),
      );
      signalAssistantResponse();
      scheduleInactivityTimer();
    },
    [signalAssistantResponse, scheduleInactivityTimer],
  );

  const sendIntent = useCallback(
    async (
      intent: PlannerIntent,
      userText: string,
      taskIdOverride: string | undefined,
      includeUserMessage: boolean,
      idempotencyKey: string | undefined,
      draftTaskTitle: string | undefined,
    ): Promise<void> => {
      const generation = sendGenerationRef.current;
      setError(null);
      setLoading(true);
      const pendingId = createMessageId();
      setMessages((prev) =>
        appendPlannerMessages(prev, {
          id: pendingId,
          role: 'assistant',
          content: '',
          actions: [],
          pending: true,
        }),
      );

      const taskId = taskIdOverride ?? planner.contextTaskId;
      const sendMessage =
        intent === 'freeform' || (intent === 'split_task' && includeUserMessage)
          ? userText
          : undefined;

      try {
        let responsePromise: Promise<PlannerChatResponse>;
        if (idempotencyKey !== undefined) {
          const existing = idempotentInFlightRef.current.get(idempotencyKey);
          if (existing !== undefined) {
            responsePromise = existing;
          } else {
            responsePromise = sendPlannerMessage({
              intent,
              message: sendMessage,
              taskId,
              draftTaskTitle,
              idempotencyKey,
            });
            idempotentInFlightRef.current.set(idempotencyKey, responsePromise);
            responsePromise.finally(() => {
              idempotentInFlightRef.current.delete(idempotencyKey);
            });
          }
        } else {
          responsePromise = sendPlannerMessage({
            intent,
            message: sendMessage,
            taskId,
            draftTaskTitle,
            idempotencyKey: undefined,
          });
        }

        const response = await responsePromise;
        if (generation !== sendGenerationRef.current) {
          return;
        }
        applyAssistantResponse(pendingId, response);
      } catch (err: unknown) {
        if (generation !== sendGenerationRef.current) {
          return;
        }
        setMessages((prev) => prev.filter((msg) => msg.id !== pendingId));
        setError(toUiErrorMessage(err));
      } finally {
        if (generation === sendGenerationRef.current) {
          setLoading(false);
        }
      }
    },
    [planner.contextTaskId, applyAssistantResponse],
  );

  const startInitialSplit = useCallback(
    (taskId: string, taskTitle: string | undefined): void => {
      const label = userLabelForIntent('split_task', taskTitle);
      planner.setContextTask(taskId, taskTitle);
      setSplitPickPhase('idle');
      setAwaitingSplitClarification(false);
      setError(null);
      setMessages((prev) =>
        appendPlannerMessages(prev, {
          id: createMessageId(),
          role: 'user',
          content: label,
          actions: [],
          pending: false,
        }),
      );
      playPlannerPopSound();
      recordUserActivity();
      sendIntent('split_task', label, taskId, false, splitInitialIdempotencyKey(taskId), undefined).catch(
        () => undefined,
      );
    },
    [sendIntent, planner, recordUserActivity],
  );

  const startDraftSplit = useCallback(
    (title: string): void => {
      setDraftSplitTitle(title);
      setSplitPickPhase('idle');
      setAwaitingSplitClarification(false);
      setError(null);
      const label = userLabelForIntent('split_task', title);
      setMessages((prev) =>
        appendPlannerMessages(prev, {
          id: createMessageId(),
          role: 'user',
          content: label,
          actions: [],
          pending: false,
        }),
      );
      playPlannerPopSound();
      recordUserActivity();
      sendIntent('split_task', label, undefined, false, undefined, title).catch(() => undefined);
    },
    [sendIntent, recordUserActivity],
  );

  const beginSplitTaskPicker = useCallback(async (): Promise<void> => {
    setError(null);
    setSplitPickPhase('choose_task');
    setMessages((prev) =>
      appendPlannerMessages(prev, {
        id: createMessageId(),
        role: 'user',
        content: 'Split a task',
        actions: [],
        pending: false,
      }),
    );
    playPlannerPopSound();
    recordUserActivity();
    try {
      const result = await getTasks({
        status: 'PENDING',
        page: 1,
        pageSize: 20,
        sort: 'dueAt',
        order: 'asc',
      });
      const topLevelTasks = result.items.filter((task) => task.parentTaskId === null);
      setSplitPickTasks(topLevelTasks);
      const pickContent =
        topLevelTasks.length > 0
          ? 'Which task would you like to split? Pick one below, or type a new task title.'
          : 'You have no pending tasks yet. Type a new task title to split.';
      setMessages((prev) =>
        appendPlannerMessages(prev, {
          id: createMessageId(),
          role: 'assistant',
          content: pickContent,
          actions: [
            {
              type: 'pick_task',
              tasks: topLevelTasks.map((task) => ({ taskId: task.id, title: task.title })),
            },
          ],
          pending: false,
        }),
      );
    } catch (err: unknown) {
      setSplitPickPhase('idle');
      setError(toUiErrorMessage(err));
    }
  }, [recordUserActivity]);

  const onPickTaskForSplit = useCallback(
    (taskId: string, title: string): void => {
      recordUserActivity();
      startInitialSplit(taskId, title);
    },
    [startInitialSplit, recordUserActivity],
  );

  const handleSplitTaskTextInput = useCallback(
    (rawInput: string): void => {
      const trimmed = rawInput.trim();
      if (trimmed.length === 0) {
        return;
      }
      setMessages((prev) =>
        appendPlannerMessages(prev, {
          id: createMessageId(),
          role: 'user',
          content: trimmed,
          actions: [],
          pending: false,
        }),
      );
      const matched = findTaskByTitle(splitPickTasks, trimmed);
      if (matched !== undefined) {
        setSplitPickPhase('idle');
        startInitialSplit(matched.id, matched.title);
        return;
      }
      setSplitPickPhase('idle');
      startDraftSplit(trimmed);
    },
    [splitPickTasks, startInitialSplit, startDraftSplit],
  );

  useLayoutEffect(() => {
    const action = planner.pendingAction;
    if (!planner.isExpanded || action === null || loading) {
      return;
    }
    planner.clearPendingAction();
    if (action.intent === 'split_task' && action.taskId !== undefined) {
      startInitialSplit(action.taskId, action.taskTitle ?? planner.contextTaskTitle);
      return;
    }
    const taskTitle = action.taskTitle ?? planner.contextTaskTitle;
    const label = userLabelForIntent(action.intent, taskTitle);
    setMessages((prev) =>
      appendPlannerMessages(prev, {
        id: createMessageId(),
        role: 'user',
        content: label,
        actions: [],
        pending: false,
      }),
    );
    playPlannerPopSound();
    recordUserActivity();
    sendIntent(action.intent, label, action.taskId, false, undefined, undefined).catch(() => undefined);
  }, [
    planner.isExpanded,
    planner.pendingAction,
    planner.contextTaskTitle,
    planner.clearPendingAction,
    loading,
    sendIntent,
    startInitialSplit,
    planner,
    recordUserActivity,
  ]);

  const onQuickIntent = useCallback(
    (intent: PlannerIntent): void => {
      const action = PLANNER_QUICK_INTENT_OPTIONS.find((item) => item.intent === intent);
      if (action === undefined) {
        return;
      }
      if (action.intent === 'split_task') {
        if (planner.contextTaskId !== undefined) {
          startInitialSplit(planner.contextTaskId, planner.contextTaskTitle);
          return;
        }
        beginSplitTaskPicker().catch(() => undefined);
        return;
      }
      const label = userLabelForIntent(action.intent, undefined);
      setMessages((prev) =>
        appendPlannerMessages(prev, {
          id: createMessageId(),
          role: 'user',
          content: label,
          actions: [],
          pending: false,
        }),
      );
      playPlannerPopSound();
      recordUserActivity();
      sendIntent(action.intent, label, undefined, false, undefined, undefined).catch(() => undefined);
    },
    [planner.contextTaskId, planner.contextTaskTitle, sendIntent, startInitialSplit, beginSplitTaskPicker, recordUserActivity],
  );

  const onKeepChatOpen = useCallback((): void => {
    closeWarningShownRef.current = false;
    recordUserActivity();
    playPlannerPopSound();
  }, [recordUserActivity]);

  const onCloseChat = useCallback((): void => {
    planner.closePopup();
  }, [planner]);

  const onStartFocus = useCallback(
    (taskId: string, taskTitle: string): void => {
      recordUserActivity();
      setError(null);
      setStartingFocusTaskId(taskId);
      focus
        .startFocus(taskId, taskTitle)
        .then(() => {
          planner.minimizePopup();
        })
        .catch((err: unknown) => {
          setError(toUiErrorMessage(err));
        })
        .finally(() => {
          setStartingFocusTaskId(null);
        });
    },
    [focus, planner, recordUserActivity],
  );

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const trimmed = input.trim();
      if (trimmed.length === 0 || loading) {
        return;
      }
      setInput('');
      if (splitPickPhase === 'choose_task') {
        handleSplitTaskTextInput(trimmed);
        return;
      }
      setMessages((prev) =>
        appendPlannerMessages(prev, {
          id: createMessageId(),
          role: 'user',
          content: trimmed,
          actions: [],
          pending: false,
        }),
      );
      playPlannerPopSound();
      recordUserActivity();
      if (awaitingSplitClarification && draftSplitTitle !== undefined) {
        sendIntent('split_task', trimmed, undefined, true, undefined, draftSplitTitle).catch(() => undefined);
        return;
      }
      if (awaitingSplitClarification && planner.contextTaskId !== undefined) {
        sendIntent('split_task', trimmed, planner.contextTaskId, true, undefined, undefined).catch(() => undefined);
        return;
      }
      sendIntent('freeform', trimmed, undefined, true, undefined, undefined).catch(() => undefined);
    },
    [input, loading, sendIntent, awaitingSplitClarification, draftSplitTitle, planner.contextTaskId, splitPickPhase, handleSplitTaskTextInput, recordUserActivity],
  );

  const onConfirmDraftAdd = useCallback(
    async (action: PlannerProposeDraftSubtasksAction): Promise<void> => {
      recordUserActivity();
      setApplyingActionId(`draft:${action.parentTaskTitle}`);
      setError(null);
      try {
        const parent = await createTask({
          title: action.parentTaskTitle,
          description: undefined,
          dueAt: undefined,
          parentTaskId: undefined,
        });
        for (const subtask of action.subtasks) {
          await createTask({
            title: subtask.title,
            description: undefined,
            dueAt: subtask.dueAt ?? undefined,
            parentTaskId: parent.id,
          });
        }
        notifyTasksRefresh({ expandParentId: parent.id });
        planner.setContextTask(parent.id, parent.title);
        setDraftSplitTitle(undefined);
        setAwaitingSplitClarification(false);
        setSplitPickTasks((prev) => [...prev, parent]);
        appendAssistant(
          `Added "${action.parentTaskTitle}" to your task list with ${action.subtasks.length} sub-task${action.subtasks.length === 1 ? '' : 's'}.`,
          [
            {
              type: 'navigate',
              navigate: {
                path: `/tasks?status=PENDING&expandParent=${encodeURIComponent(parent.id)}`,
                label: `View "${action.parentTaskTitle}" and sub-tasks`,
              },
            },
          ],
        );
      } catch (err: unknown) {
        setError(toUiErrorMessage(err));
      } finally {
        setApplyingActionId(null);
      }
    },
    [appendAssistant, planner, recordUserActivity],
  );

  const onSkipDraftAdd = useCallback(
    (action: PlannerProposeDraftSubtasksAction): void => {
      recordUserActivity();
      setDraftSplitTitle(undefined);
      setAwaitingSplitClarification(false);
      appendAssistant(
        `Okay — I won't add "${action.parentTaskTitle}" to your task list.`,
        [],
      );
    },
    [appendAssistant, recordUserActivity],
  );

  const onNavigate = useCallback(
    (path: string): void => {
      planner.closePopup();
      navigate(path);
    },
    [navigate, planner],
  );

  const applySubtasks = useCallback(async (action: PlannerCreateSubtasksAction): Promise<void> => {
    setApplyingActionId(action.parentTaskId);
    setError(null);
    try {
      for (const subtask of action.subtasks) {
        await createTask({
          title: subtask.title,
          description: undefined,
          dueAt: subtask.dueAt ?? undefined,
          parentTaskId: action.parentTaskId,
        });
      }
      notifyTasksRefresh({ expandParentId: action.parentTaskId });
      setAwaitingSplitClarification(false);
      appendAssistant(
        `Created ${action.subtasks.length} sub-task${action.subtasks.length === 1 ? '' : 's'} linked to "${action.parentTaskTitle}".`,
        [
          {
            type: 'navigate',
            navigate: {
              path: `/tasks?status=PENDING&expandParent=${encodeURIComponent(action.parentTaskId)}`,
              label: `View "${action.parentTaskTitle}" and sub-tasks`,
            },
          },
        ],
      );
    } catch (err: unknown) {
      setError(toUiErrorMessage(err));
    } finally {
      setApplyingActionId(null);
      setConfirmSubtasks(null);
    }
  }, [appendAssistant]);

  const onApplySubtasks = useCallback((action: PlannerCreateSubtasksAction): void => {
    recordUserActivity();
    setConfirmSubtasks(action);
  }, [recordUserActivity]);

  const onConfirmDismiss = useCallback(
    (role: 'cancel' | 'destructive' | 'confirm' | 'backdrop'): void => {
      const action = confirmSubtasks;
      setConfirmSubtasks(null);
      if (role !== 'confirm' || action === null) {
        return;
      }
      applySubtasks(action).catch(() => undefined);
    },
    [applySubtasks, confirmSubtasks],
  );

  if (!planner.isSessionActive) {
    return null;
  }

  const confirmMessage =
    confirmSubtasks !== null
      ? `Create ${confirmSubtasks.subtasks.length} sub-task${confirmSubtasks.subtasks.length === 1 ? '' : 's'} under "${confirmSubtasks.parentTaskTitle}"?`
      : '';

  return (
    <>
      {planner.isExpanded ? (
        <div
          className="tf-planner-popup__backdrop"
          role="presentation"
          onClick={planner.minimizePopup}
        />
      ) : null}
      {planner.isExpanded ? (
      <section
        className={cn('tf-planner-popup', responseFlash ? 'tf-planner-popup--response-flash' : undefined)}
        aria-label="AI planner assistant"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="m-0 text-base font-bold text-text">Planner</h2>
              {responseFlash ? (
                <span className="tf-planner-popup__new-reply" role="status">
                  New reply
                </span>
              ) : null}
            </div>
            <p className="m-0 text-xs text-text-muted">Calendar, task splitting, and planning Q&amp;A</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-tf-sm border-none bg-transparent text-text-muted hover:bg-primary-light hover:text-primary"
            aria-label="Minimize planner"
            onClick={planner.minimizePopup}
          >
            <Icon name="minimize" size={20} className={undefined} aria-hidden={true} />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-tf-sm border-none bg-transparent text-text-muted hover:bg-primary-light hover:text-primary"
            aria-label="Close planner"
            onClick={planner.closePopup}
          >
            <Icon name="close" size={20} className={undefined} aria-hidden={true} />
          </button>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'max-w-[92%] rounded-tf-sm px-3 py-2 text-sm leading-relaxed',
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-white'
                    : 'mr-auto bg-surface text-text',
                )}
              >
                {message.pending ? (
                  <PlannerTypingIndicator />
                ) : (
                  <p className="m-0 whitespace-pre-wrap">{message.content}</p>
                )}
                {message.role === 'assistant' && !message.pending
                  ? message.actions.map((action) => (
                      <PlannerAgentActionCard
                        key={
                          action.type === 'navigate'
                            ? action.navigate.path
                            : action.type === 'create_subtasks'
                              ? action.parentTaskId
                                : action.type === 'pick_task'
                                  ? `pick-task-${message.id}`
                                  : action.type === 'quick_intents'
                                    ? `quick-intents-${message.id}`
                                    : action.type === 'confirm_close_chat'
                                      ? `confirm-close-${message.id}`
                                      : action.type === 'propose_draft_subtasks'
                                  ? `draft-${action.parentTaskTitle}`
                                  : action.blocks[0]?.startTime ?? action.type
                        }
                        action={action}
                        applying={
                          action.type === 'create_subtasks'
                            ? applyingActionId === action.parentTaskId
                            : action.type === 'propose_draft_subtasks'
                              ? applyingActionId === `draft:${action.parentTaskTitle}`
                              : false
                        }
                        onApplySubtasks={onApplySubtasks}
                        onNavigate={onNavigate}
                        onPickTask={onPickTaskForSplit}
                        onConfirmDraftAdd={(draftAction) => {
                          onConfirmDraftAdd(draftAction).catch(() => undefined);
                        }}
                        onSkipDraftAdd={onSkipDraftAdd}
                        onQuickIntent={onQuickIntent}
                        onKeepChatOpen={onKeepChatOpen}
                        onCloseChat={onCloseChat}
                        onStartFocus={onStartFocus}
                        startingFocusTaskId={startingFocusTaskId}
                      />
                    ))
                  : null}
              </div>
            ))}
          </div>
          {error !== null ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <form className="flex shrink-0 gap-2 border-t border-border p-3" onSubmit={onSubmit}>
          <input
            type="text"
            value={input}
            placeholder={
              splitPickPhase === 'choose_task'
                ? 'Pick a task above or type a new task title…'
                : awaitingSplitClarification
                  ? 'Answer the question so I can split the task…'
                  : 'Ask about your schedule…'
            }
            disabled={loading}
            className="min-w-0 flex-1 rounded-tf-sm border border-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:border-primary"
            onChange={(event) => setInput(event.target.value)}
          />
          <Button
            type="submit"
            fill="solid"
            size="small"
            expand={undefined}
            color="default"
            disabled={loading || input.trim().length === 0}
            className={undefined}
            aria-label="Send message"
            onClick={undefined}
          >
            Send
          </Button>
        </form>
      </section>
      ) : null}

      <ConfirmDialog
        isOpen={confirmSubtasks !== null}
        header="Create sub-tasks?"
        message={confirmMessage}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          { text: 'Create', role: 'confirm' },
        ]}
        onDismiss={onConfirmDismiss}
      />

    </>
  );
}
