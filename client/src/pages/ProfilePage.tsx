import { useCallback, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/ui';
import { useAuth } from '../lib/AuthContext';
import './ProfilePage.css';

export function ProfilePage(): ReactElement {
  const auth = useAuth();
  const navigate = useNavigate();

  const onLogout = useCallback((): void => {
    auth.logout();
    navigate('/login', { replace: true });
  }, [auth, navigate]);

  return (
    <div className="profile-page">
      <div className="profile-page__inner">
        <header className="profile-page__header">
          <h2>Profile</h2>
        </header>
        <section className="profile-card">
          <div className="profile-row">
            <span className="profile-row__label">Name</span>
            <span>{auth.user?.name ?? '—'}</span>
          </div>
          <div className="profile-row">
            <span className="profile-row__label">Email</span>
            <span>{auth.user?.email ?? '—'}</span>
          </div>
        </section>
        <section className="profile-card">
          <div className="profile-row">
            <span className="profile-row__label">Timezone</span>
            <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
          </div>
        </section>
        <Button
          type="button"
          fill="outline"
          size="default"
          expand="block"
          color="default"
          disabled={false}
          className="profile-logout"
          aria-label="Log out"
          onClick={onLogout}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
