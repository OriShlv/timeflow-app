import { useMemo, type ReactElement } from 'react';

import { formatDate } from '../../lib/dateFormat';
import { useUserPreferences } from '../../lib/useUserPreferences';
import type { Task } from '../../lib/types';
import './TaskCalendar.css';

export type TaskCalendarProps = {
  tasks: Task[];
  selectedDate: Date;
  viewYear: number;
  viewMonth: number;
  onSelectDate: (date: Date) => void;
  onViewMonthChange: (year: number, month: number) => void;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateKeyLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDay(left: Date, right: Date): boolean {
  return dateKeyLocal(left) === dateKeyLocal(right);
}

function buildCalendarDays(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const days: Date[] = [];
  for (let index = 0; index < 42; index += 1) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
  }
  return days;
}

function groupTasksByDueDate(tasks: Task[]): Map<string, Task[]> {
  const grouped = new Map<string, Task[]>();
  for (const task of tasks) {
    if (task.dueAt === null) {
      continue;
    }
    const key = dateKeyLocal(new Date(task.dueAt));
    const existing = grouped.get(key);
    if (existing === undefined) {
      grouped.set(key, [task]);
      continue;
    }
    existing.push(task);
  }
  return grouped;
}

function monthLabel(year: number, month: number, timezone: string, language: 'en' | 'he'): string {
  return formatDate(new Date(year, month, 1), timezone, language, { month: 'long', year: 'numeric' });
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = new Date(year, month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

function isOverdueTask(task: Task, today: Date): boolean {
  if (task.dueAt === null) {
    return false;
  }
  const due = new Date(task.dueAt);
  return due.getTime() < today.getTime() && !isSameDay(due, today);
}

export function TaskCalendar(props: TaskCalendarProps): ReactElement {
  const { timezone, language } = useUserPreferences();
  const today = useMemo(() => new Date(), []);
  const tasksByDate = useMemo(() => groupTasksByDueDate(props.tasks), [props.tasks]);
  const calendarDays = useMemo(
    () => buildCalendarDays(props.viewYear, props.viewMonth),
    [props.viewYear, props.viewMonth],
  );

  const onPrevMonth = (): void => {
    const next = shiftMonth(props.viewYear, props.viewMonth, -1);
    props.onViewMonthChange(next.year, next.month);
  };

  const onNextMonth = (): void => {
    const next = shiftMonth(props.viewYear, props.viewMonth, 1);
    props.onViewMonthChange(next.year, next.month);
  };

  return (
    <section className="task-calendar" aria-label="Task calendar">
      <div className="task-calendar__header">
        <h2 className="task-calendar__title">{monthLabel(props.viewYear, props.viewMonth, timezone, language)}</h2>
        <div className="task-calendar__nav">
          <button type="button" className="task-calendar__nav-btn" onClick={onPrevMonth} aria-label="Previous month">
            ‹
          </button>
          <button type="button" className="task-calendar__nav-btn" onClick={onNextMonth} aria-label="Next month">
            ›
          </button>
        </div>
      </div>
      <div className="task-calendar__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="task-calendar__weekday">
            {label}
          </span>
        ))}
      </div>
      <div className="task-calendar__grid">
        {calendarDays.map((day) => {
          const key = dateKeyLocal(day);
          const dayTasks = tasksByDate.get(key) ?? [];
          const inCurrentMonth = day.getMonth() === props.viewMonth;
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, props.selectedDate);
          const hasOverdue = dayTasks.some((task) => isOverdueTask(task, today));

          return (
            <button
              key={key}
              type="button"
              className={[
                'task-calendar__day',
                inCurrentMonth ? '' : 'task-calendar__day--muted',
                isToday ? 'task-calendar__day--today' : '',
                isSelected ? 'task-calendar__day--selected' : '',
                dayTasks.length > 0 ? 'task-calendar__day--has-events' : '',
              ]
                .filter((value) => value.length > 0)
                .join(' ')}
              onClick={() => props.onSelectDate(day)}
              aria-label={`${day.toLocaleDateString(undefined, { dateStyle: 'full' })}, ${dayTasks.length} tasks`}
            >
              <span className="task-calendar__day-num">{day.getDate()}</span>
              {dayTasks.length > 0 ? (
                <span className="task-calendar__markers">
                  {dayTasks.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      className={`task-calendar__marker ${isOverdueTask(task, today) || hasOverdue ? 'task-calendar__marker--overdue' : ''}`}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function tasksForDate(tasks: Task[], date: Date): Task[] {
  const key = dateKeyLocal(date);
  return tasks.filter((task) => task.dueAt !== null && dateKeyLocal(new Date(task.dueAt)) === key);
}
