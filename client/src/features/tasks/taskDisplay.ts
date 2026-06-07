import type { Task } from '../../lib/types';

export type TaskDisplayGroup = {
  parent: Task;
  subtasks: Task[];
};

export type TaskDisplayItem =
  | { type: 'group'; group: TaskDisplayGroup }
  | { type: 'orphan'; task: Task };

export function buildTaskDisplayItems(tasks: Task[]): TaskDisplayItem[] {
  const parentIds = new Set(
    tasks.filter((task) => task.parentTaskId === null).map((task) => task.id),
  );
  const subtasksByParent = new Map<string, Task[]>();

  for (const task of tasks) {
    if (task.parentTaskId === null || !parentIds.has(task.parentTaskId)) {
      continue;
    }
    const existing = subtasksByParent.get(task.parentTaskId);
    if (existing !== undefined) {
      existing.push(task);
      continue;
    }
    subtasksByParent.set(task.parentTaskId, [task]);
  }

  const items: TaskDisplayItem[] = [];
  for (const task of tasks) {
    if (task.parentTaskId !== null && parentIds.has(task.parentTaskId)) {
      continue;
    }
    if (task.parentTaskId === null) {
      items.push({
        type: 'group',
        group: {
          parent: task,
          subtasks: subtasksByParent.get(task.id) ?? [],
        },
      });
      continue;
    }
    items.push({ type: 'orphan', task });
  }

  return items;
}

export function mergeSubtasks(existing: Task[], loaded: Task[]): Task[] {
  const byId = new Map<string, Task>();
  for (const task of existing) {
    byId.set(task.id, task);
  }
  for (const task of loaded) {
    byId.set(task.id, task);
  }
  return [...byId.values()];
}
