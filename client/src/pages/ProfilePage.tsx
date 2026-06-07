import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input, Select, Toast } from '../components/ui';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../lib/AuthContext';
import { useT } from '../lib/i18n/I18nContext';
import { timezoneOptions } from '../lib/timezones';
import './ProfilePage.css';

type FieldErrors = {
  name?: string;
  timezone?: string;
  language?: string;
};

type ZodIssue = {
  path: (string | number)[];
  message: string;
};

function parseFieldErrors(details: unknown): FieldErrors {
  if (!Array.isArray(details)) {
    return {};
  }
  const errors: FieldErrors = {};
  for (const issue of details as ZodIssue[]) {
    const field = issue.path[0];
    if (field === 'name' || field === 'timezone' || field === 'language') {
      errors[field] = issue.message;
    }
  }
  return errors;
}

function seedFormFromUser(
  user: { name: string | null; timezone: string },
  setName: (value: string) => void,
  setTimezone: (value: string) => void,
): void {
  setName(user.name ?? '');
  setTimezone(user.timezone);
}

export function ProfilePage(): ReactElement {
  const { user, refreshUser, updateSettings, logout } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const [name, setName] = useState<string>(() => user?.name ?? '');
  const [timezone, setTimezone] = useState<string>(() => user?.timezone ?? 'UTC');
  const [loading, setLoading] = useState<boolean>(() => user === null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  const timezoneSelectOptions = useMemo(() => timezoneOptions(), []);

  const loadProfile = useCallback(
    (showLoading: boolean): void => {
      if (showLoading) {
        setLoading(true);
      }
      setLoadError(null);
      refreshUser()
        .then((freshUser) => {
          seedFormFromUser(freshUser, setName, setTimezone);
        })
        .catch(() => {
          setLoadError(t('profile.loadError'));
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [refreshUser, t],
  );

  useEffect(() => {
    let cancelled = false;
    const showLoading = user === null;
    if (showLoading) {
      setLoading(true);
    }
    setLoadError(null);
    refreshUser()
      .then((freshUser) => {
        if (cancelled) {
          return;
        }
        seedFormFromUser(freshUser, setName, setTimezone);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setLoadError(t('profile.loadError'));
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const onLogout = useCallback((): void => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (saving || loading) {
      return;
    }
    setSaving(true);
    setFieldErrors({});
    setSaveError(null);
    try {
      await updateSettings({
        name: name.trim().length === 0 ? null : name.trim(),
        timezone,
      });
      setToastMessage(t('profile.saveSuccess'));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 400 && err.details !== undefined) {
        setFieldErrors(parseFieldErrors(err.details));
      } else {
        setSaveError(err instanceof Error ? err.message : t('common.requestFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-page__inner">
        <header className="profile-page__header">
          <h2>{t('profile.title')}</h2>
        </header>

        {loading ? <div className="profile-page__state">{t('profile.loading')}</div> : null}

        {loadError !== null ? (
          <div className="profile-page__state profile-page__state--error">
            <span>{loadError}</span>
            <Button
              type="button"
              fill="clear"
              size="small"
              expand={undefined}
              color="default"
              disabled={false}
              className={undefined}
              aria-label={t('profile.retryLoad')}
              onClick={() => loadProfile(true)}
            >
              {t('profile.retryLoad')}
            </Button>
          </div>
        ) : null}

        {!loading && loadError === null ? (
          <form className="profile-form" onSubmit={onSubmit}>
            <section className="profile-card">
              <div className="profile-field">
                <label htmlFor="profile-email">{t('profile.email')}</label>
                <span className="profile-field__readonly">{user?.email ?? '—'}</span>
              </div>
            </section>

            <section className="profile-card">
              <div className="profile-field">
                <label htmlFor="profile-name">{t('profile.name')}</label>
                <Input
                  id="profile-name"
                  type="text"
                  value={name}
                  placeholder={t('profile.namePlaceholder')}
                  disabled={saving}
                  autoComplete="name"
                  className={undefined}
                  onChange={setName}
                  onBlur={undefined}
                />
                {fieldErrors.name !== undefined ? (
                  <p className="profile-field__error">{fieldErrors.name}</p>
                ) : null}
              </div>

              <div className="profile-field">
                <label htmlFor="profile-timezone">{t('profile.timezone')}</label>
                <Select
                  value={timezone}
                  options={timezoneSelectOptions}
                  placeholder={undefined}
                  disabled={saving}
                  className={undefined}
                  onChange={setTimezone}
                />
                {fieldErrors.timezone !== undefined ? (
                  <p className="profile-field__error">{fieldErrors.timezone}</p>
                ) : null}
              </div>
            </section>

            {saveError !== null ? (
              <div className="profile-page__state profile-page__state--error">
                <span>{saveError}</span>
                <Button
                  type="button"
                  fill="clear"
                  size="small"
                  expand={undefined}
                  color="default"
                  disabled={saving}
                  className={undefined}
                  aria-label={t('profile.retryLoad')}
                  onClick={() => {
                    setSaveError(null);
                    void onSubmit({ preventDefault: () => undefined } as FormEvent<HTMLFormElement>);
                  }}
                >
                  {t('profile.retryLoad')}
                </Button>
              </div>
            ) : null}

            <Button
              type="submit"
              fill="solid"
              size="default"
              expand="block"
              color="default"
              disabled={saving}
              className="profile-save"
              aria-label={t('profile.save')}
              onClick={undefined}
            >
              {saving ? t('profile.saving') : t('profile.save')}
            </Button>
          </form>
        ) : null}

        <Button
          type="button"
          fill="outline"
          size="default"
          expand="block"
          color="default"
          disabled={false}
          className="profile-logout"
          aria-label={t('profile.logout')}
          onClick={onLogout}
        >
          {t('profile.logout')}
        </Button>
      </div>
      <Toast
        isOpen={toastMessage.length > 0}
        message={toastMessage}
        durationMs={2500}
        onDismiss={() => setToastMessage('')}
      />
    </div>
  );
}
