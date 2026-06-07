const FALLBACK_TIMEZONES: string[] = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Jerusalem',
  'Asia/Tokyo',
  'Australia/Sydney',
];

function loadTimezones(): string[] {
  const supportedValuesOf = (
    Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;
  if (supportedValuesOf !== undefined) {
    return supportedValuesOf('timeZone').slice().sort();
  }
  return FALLBACK_TIMEZONES;
}

export const IANA_TIMEZONES: string[] = loadTimezones();

export function timezoneOptions(): { value: string; label: string }[] {
  return IANA_TIMEZONES.map((tz) => ({ value: tz, label: tz }));
}
