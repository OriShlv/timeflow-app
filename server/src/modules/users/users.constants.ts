export const ALLOWED_LANGUAGES = ['en', 'he'] as const;

export type AllowedLanguage = (typeof ALLOWED_LANGUAGES)[number];

export const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  timezone: true,
  language: true,
  createdAt: true,
} as const;
