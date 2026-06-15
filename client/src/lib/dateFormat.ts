import type { AppLanguage } from './i18n/translations';

export type DateFormatOptions = {
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  weekday?: 'long' | 'short' | 'narrow';
  month?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit';
  day?: 'numeric' | '2-digit';
  year?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
};

export function formatDateTime(
  value: string | Date,
  timezone: string,
  language: AppLanguage,
  options: DateFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(language, { ...options, timeZone: timezone });
}

export function formatDate(
  value: string | Date,
  timezone: string,
  language: AppLanguage,
  options: DateFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(language, { ...options, timeZone: timezone });
}

export function formatUtcDate(
  value: string | Date,
  language: AppLanguage,
  options: DateFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(language, { ...options, timeZone: 'UTC' });
}

export function formatCalendarDate(
  value: Date,
  language: AppLanguage,
  options: DateFormatOptions,
): string {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  return date.toLocaleDateString(language, { ...options, timeZone: 'UTC' });
}

export function formatTime(
  value: string | Date,
  timezone: string,
  language: AppLanguage,
  options: DateFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString(language, { ...options, timeZone: timezone });
}

export function dateKeyInTimezone(value: string | Date, timezone: string): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((item) => item.type === type);
    if (part === undefined) {
      throw new Error(`Missing ${type} date part for timezone ${timezone}`);
    }
    return part.value;
  };

  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function nowInTimezone(timezone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((item) => item.type === type);
    return part?.value ?? '0';
  };

  return new Date(
    `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`,
  );
}

export function hourInTimezone(timezone: string): number {
  return nowInTimezone(timezone).getHours();
}
