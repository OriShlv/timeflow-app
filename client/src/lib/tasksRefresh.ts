export type TasksRefreshDetail = {
  expandParentId: string | undefined;
};

type TasksRefreshListener = (detail: TasksRefreshDetail) => void;

const listeners = new Set<TasksRefreshListener>();

export function notifyTasksRefresh(detail: TasksRefreshDetail): void {
  listeners.forEach((listener) => {
    listener(detail);
  });
}

export function subscribeTasksRefresh(listener: TasksRefreshListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
