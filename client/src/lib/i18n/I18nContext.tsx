import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';

import { useAuth } from '../AuthContext';
import { UI_LOCALE_SWITCHING_ENABLED } from './config';
import { translate, type AppLanguage } from './translations';

export type I18nContextValue = {
  language: AppLanguage;
  t: (key: string, params?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export type I18nProviderProps = {
  children: ReactNode;
};

function resolveLanguage(raw: string | undefined): AppLanguage {
  if (raw === 'he') {
    return 'he';
  }
  return 'en';
}

export function I18nProvider(props: I18nProviderProps): ReactElement {
  const auth = useAuth();
  const language: AppLanguage = UI_LOCALE_SWITCHING_ENABLED
    ? resolveLanguage(auth.user?.language)
    : 'en';

  useEffect(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, string>): string => {
      return translate(language, key, params);
    },
    [language],
  );

  const value = useMemo((): I18nContextValue => ({ language, t }), [language, t]);

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (context === null) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

export function useT(): I18nContextValue['t'] {
  return useI18n().t;
}
