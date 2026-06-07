import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Task } from '../../lib/types';
import { TaskCalendar, tasksForDate } from './TaskCalendar';

vi.mock('../../lib/useUserPreferences', () => ({
  useUserPreferences: () => ({
    timezone: 'America/Los_Angeles',
    language: 'en',
  }),
}));

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'task-1',
    title: 'Late task',
    description: null,
    status: 'PENDING',
    dueAt: '2026-06-08T05:30:00.000Z',
    parentTaskId: null,
    parentTaskTitle: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TaskCalendar timezone bucketing', () => {
  afterEach(() => {
    cleanup();
  });

  it('selects tasks by the saved profile timezone date', () => {
    const tasks = [makeTask({})];

    expect(tasksForDate(tasks, new Date(2026, 5, 7), 'America/Los_Angeles').map((task) => task.id)).toEqual([
      'task-1',
    ]);
    expect(tasksForDate(tasks, new Date(2026, 5, 8), 'America/Los_Angeles')).toEqual([]);
  });

  it('renders a near-midnight due task on the profile timezone calendar day', () => {
    render(
      <TaskCalendar
        tasks={[makeTask({})]}
        selectedDate={new Date(2026, 5, 7)}
        viewYear={2026}
        viewMonth={5}
        onSelectDate={vi.fn()}
        onViewMonthChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /June 7, 2026, 1 tasks/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /June 8, 2026, 0 tasks/i })).toBeTruthy();
  });
});
