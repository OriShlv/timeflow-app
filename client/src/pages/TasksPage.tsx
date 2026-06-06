import { useCallback, useRef, useState, type ReactElement } from 'react';

import { ConfirmDialog, Fab, Modal, Toast } from '../components/ui';
import { TaskForm } from '../features/tasks/TaskForm';
import { TasksList, type TasksListHandle } from '../features/tasks/TasksList';
import { deleteTask } from '../lib/tasksApi';
import type { Task } from '../lib/types';
import './TasksPage.css';

export function TasksPage(): ReactElement {
  const listRef = useRef<TasksListHandle>(null);
  const [taskFormOpen, setTaskFormOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  const openCreateForm = useCallback((): void => {
    setEditingTask(null);
    setTaskFormOpen(true);
  }, []);

  const onEditTask = useCallback((task: Task): void => {
    setEditingTask(task);
    setTaskFormOpen(true);
  }, []);

  const onDeleteTask = useCallback((task: Task): void => {
    setTaskToDelete(task);
    setDeleteOpen(true);
  }, []);

  const closeTaskForm = useCallback((): void => {
    setTaskFormOpen(false);
    setEditingTask(null);
  }, []);

  const onTaskSaved = useCallback((): void => {
    const wasEdit = editingTask !== null;
    setTaskFormOpen(false);
    setEditingTask(null);
    listRef.current?.reload();
    setToastMessage(wasEdit ? 'Task updated' : 'Task created');
  }, [editingTask]);

  const onDeleteDismiss = useCallback(
    (role: 'cancel' | 'destructive' | 'confirm' | 'backdrop'): void => {
      setDeleteOpen(false);
      if (role === 'backdrop' || role === 'cancel') {
        setTaskToDelete(null);
        return;
      }
      if (role === 'destructive') {
        const task = taskToDelete;
        if (task === null) {
          return;
        }
        deleteTask(task.id)
          .then(() => {
            setTaskToDelete(null);
            listRef.current?.reload();
          })
          .catch(() => {
            setTaskToDelete(null);
          });
      }
    },
    [taskToDelete],
  );

  const deleteMessage =
    taskToDelete !== null ? `Delete "${taskToDelete.title}"?` : '';

  return (
    <div className="tasks-page">
      <TasksList ref={listRef} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
      <Fab iconName="add" ariaLabel="Create task" onClick={openCreateForm} />
      <Modal isOpen={taskFormOpen} onClose={closeTaskForm}>
        <TaskForm task={editingTask} onClose={closeTaskForm} onSaved={onTaskSaved} />
      </Modal>
      <ConfirmDialog
        isOpen={deleteOpen}
        header="Delete task"
        message={deleteMessage}
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          { text: 'Delete', role: 'destructive' },
        ]}
        onDismiss={onDeleteDismiss}
      />
      <Toast
        isOpen={toastMessage.length > 0}
        message={toastMessage}
        durationMs={2500}
        onDismiss={() => setToastMessage('')}
      />
    </div>
  );
}
