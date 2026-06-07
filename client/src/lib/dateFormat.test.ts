import { describe, expect, it } from 'vitest';

import { dateKeyInTimezone, formatUtcDate } from './dateFormat';

describe('dateFormat timezone helpers', () => {
  it('builds date keys from the requested timezone', () => {
    const dueAt = '2026-06-08T05:30:00.000Z';

    expect(dateKeyInTimezone(dueAt, 'America/Los_Angeles')).toBe('2026-06-07');
    expect(dateKeyInTimezone(dueAt, 'UTC')).toBe('2026-06-08');
  });

  it('formats UTC day buckets without shifting them into profile timezones', () => {
    const formatted = formatUtcDate('2026-06-07T00:00:00.000Z', 'en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    expect(formatted).toContain('Jun 7');
  });
});
