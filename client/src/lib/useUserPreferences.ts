import { useAuth } from './AuthContext';
import { UI_LOCALE_SWITCHING_ENABLED } from './i18n/config';
import type { AppLanguage } from './i18n/translations';

export type UserPreferences = {
  timezone: string;
  language: AppLanguage;
};

export function useUserPreferences(): UserPreferences {
  const auth = useAuth();
  const timezone = auth.user?.timezone ?? 'UTC';
  const language: AppLanguage =
    UI_LOCALE_SWITCHING_ENABLED && auth.user?.language === 'he' ? 'he' : 'en';
  return { timezone, language };
}
