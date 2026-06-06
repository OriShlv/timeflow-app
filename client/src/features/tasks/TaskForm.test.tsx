import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Task } from '../../lib/types';
import { createTask, updateTask } from '../../lib/tasksApi';
import { TaskForm, localInputToIso } from './TaskForm';

vi.mock('../../lib/tasksApi', () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
}));

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function dueAtToLocalInput(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'task-1',
    title: 'Existing task',
    description: null,
    status: 'PENDING',
    dueAt: '2024-06-15T14:30:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TaskForm due date', () => {
  const onClose = vi.fn();
  const onSaved = vi.fn();

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createTask).mockResolvedValue(makeTask({}));
    vi.mocked(updateTask).mockResolvedValue(makeTask({}));
  });

  it('prefills edit form with local datetime from task dueAt ISO', () => {
    const dueAtIso = '2024-06-15T14:30:00.000Z';
    const task = makeTask({ dueAt: dueAtIso });

    render(<TaskForm task={task} onClose={onClose} onSaved={onSaved} />);

    const dueInput = screen.getByLabelText(/due date/i) as HTMLInputElement;
    expect(dueInput.value).toBe(dueAtToLocalInput(dueAtIso));
  });

  it('converts local datetime input to ISO on create submit', async () => {
    const localDueAt = '2024-06-15T10:30';

    const { container } = render(<TaskForm task={null} onClose={onClose} onSaved={onSaved} />);
    const view = within(container);

    fireEvent.change(view.getByLabelText(/^title$/i), {
      target: { value: 'New task' },
    });
    fireEvent.change(view.getByLabelText(/due date/i), {
      target: { value: localDueAt },
    });
    fireEvent.click(view.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith({
        title: 'New task',
        description: undefined,
        dueAt: new Date(localDueAt).toISOString(),
      });
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('rejects invalid due date strings on submit conversion', () => {
    expect(() => localInputToIso('not-a-valid-date')).toThrow('Invalid due date');
    expect(() => localInputToIso('invalid')).toThrow('Invalid due date');
  });
});
