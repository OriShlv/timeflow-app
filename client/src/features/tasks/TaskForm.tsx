import { useCallback, useEffect, useState, type FormEvent, type ReactElement } from 'react';

import { Button, ConfirmDialog, Input, Select, Textarea } from '../../components/ui';
import type { SelectOption } from '../../components/ui/Select';
import { toUiErrorMessage } from '../../lib/apiFeedback';
import { createTask, updateTask } from '../../lib/tasksApi';
import type { Task, TaskStatus } from '../../lib/types';
import './TaskForm.css';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELED', label: 'Canceled' },
];

export type TaskFormProps = {
  task: Task | null;
  onClose: () => void;
  onSaved: () => void;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function dueAtToLocalInput(iso: string | null): string {
  if (iso === null) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function localInputToIso(local: string): string | undefined {
  const trimmed = local.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid due date');
  }
  return parsed.toISOString();
}

export function TaskForm(props: TaskFormProps): ReactElement {
  const isEdit = props.task !== null;

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dueAt, setDueAt] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus>('PENDING');
  const [titleTouched, setTitleTouched] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  useEffect(() => {
    const task = props.task;
    if (task !== null) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setDueAt(dueAtToLocalInput(task.dueAt));
      setStatus(task.status);
    } else {
      setTitle('');
      setDescription('');
      setDueAt('');
      setStatus('PENDING');
    }
    setTitleTouched(false);
    setErrorMessage(null);
    setSaving(false);
    setConfirmOpen(false);
  }, [props.task]);

  const titleInvalid = title.trim().length === 0;

  const close = useCallback((): void => {
    props.onClose();
  }, [props]);

  const submit = useCallback((): void => {
    if (titleInvalid || saving) {
      return;
    }

    setErrorMessage(null);
    setSaving(true);

    let dueAtIso: string | undefined;
    try {
      dueAtIso = localInputToIso(dueAt);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid due date';
      setErrorMessage(message);
      setSaving(false);
      return;
    }

    const descOrUndefined = description.trim().length > 0 ? description.trim() : undefined;
    const taskId = props.task?.id;

    if (taskId !== undefined) {
      updateTask(taskId, {
        title,
        description: descOrUndefined ?? null,
        dueAt: dueAtIso ?? null,
        status,
      })
        .then(() => {
          setSaving(false);
          props.onSaved();
        })
        .catch((err: unknown) => {
          setErrorMessage(toUiErrorMessage(err));
          setSaving(false);
        });
    } else {
      createTask({
        title,
        description: descOrUndefined,
        dueAt: dueAtIso,
        parentTaskId: undefined,
      })
        .then(() => {
          setSaving(false);
          props.onSaved();
        })
        .catch((err: unknown) => {
          setErrorMessage(toUiErrorMessage(err));
          setSaving(false);
        });
    }
  }, [title, description, dueAt, status, titleInvalid, saving, props]);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      if (titleInvalid || saving) {
        return;
      }
      if (isEdit) {
        setConfirmOpen(true);
        return;
      }
      submit();
    },
    [titleInvalid, saving, isEdit, submit],
  );

  const onConfirmDismiss = useCallback(
    (role: 'cancel' | 'destructive' | 'confirm' | 'backdrop'): void => {
      setConfirmOpen(false);
      if (role === 'confirm') {
        submit();
      }
    },
    [submit],
  );

  return (
    <>
      <header className="task-form-header">
        <h2 className="task-form-title">{isEdit ? 'Edit task' : 'New task'}</h2>
        <Button
          type="button"
          fill="clear"
          size="default"
          expand={undefined}
          color="default"
          disabled={false}
          className={undefined}
          aria-label={undefined}
          onClick={close}
        >
          Cancel
        </Button>
      </header>
      <form className="task-form" onSubmit={onSubmit}>
        {errorMessage !== null ? <p className="task-form__error">{errorMessage}</p> : null}
        <div className="field-group">
          <label className="field-label" htmlFor="task-title">
            Title
          </label>
          <Input
            id="task-title"
            type="text"
            value={title}
            placeholder="Task title"
            disabled={false}
            autoComplete={undefined}
            className="task-form-input"
            onChange={setTitle}
            onBlur={() => setTitleTouched(true)}
          />
          {titleTouched && titleInvalid ? (
            <p className="field-error">Title is required</p>
          ) : null}
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="task-description">
            Description <span className="optional">(optional)</span>
          </label>
          <Textarea
            id="task-description"
            value={description}
            placeholder="Task description"
            rows={3}
            disabled={false}
            className="task-form-input"
            onChange={setDescription}
          />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="task-due-at">
            Due date <span className="optional">(optional)</span>
          </label>
          <Input
            id="task-due-at"
            type="datetime-local"
            value={dueAt}
            placeholder={undefined}
            disabled={false}
            autoComplete={undefined}
            className="task-form-input"
            onChange={setDueAt}
            onBlur={undefined}
          />
        </div>
        {isEdit ? (
          <div className="field-group">
            <label className="field-label" htmlFor="task-status">
              Status
            </label>
            <Select
              value={status}
              options={STATUS_OPTIONS}
              placeholder={undefined}
              disabled={false}
              className="task-form-select"
              onChange={(value) => setStatus(value as TaskStatus)}
            />
          </div>
        ) : null}
        <Button
          type="submit"
          fill="solid"
          size="default"
          expand="block"
          color="default"
          disabled={titleInvalid || saving}
          className="submit-btn"
          aria-label={undefined}
          onClick={undefined}
        >
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
        </Button>
      </form>
      <ConfirmDialog
        isOpen={confirmOpen}
        header="Save changes?"
        message="Save changes to this task?"
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          { text: 'Save', role: 'confirm' },
        ]}
        onDismiss={onConfirmDismiss}
      />
    </>
  );
}
