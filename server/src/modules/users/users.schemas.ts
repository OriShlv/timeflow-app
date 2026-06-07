import { z } from 'zod';

import { ALLOWED_LANGUAGES } from './users.constants';

export function isValidIanaTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const ianaTimezoneSchema = z
  .string()
  .min(1)
  .refine(isValidIanaTimezone, { message: 'Invalid IANA timezone identifier' });

const languageSchema = z.enum(ALLOWED_LANGUAGES, {
  message: `Language must be one of: ${ALLOWED_LANGUAGES.join(', ')}`,
});

export const updateUserSettingsSchema = z.object({
  name: z
    .string()
    .transform((value) => {
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable()
    .optional(),
  timezone: ianaTimezoneSchema.optional(),
  language: languageSchema.optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
