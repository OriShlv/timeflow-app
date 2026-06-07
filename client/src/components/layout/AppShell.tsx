import { useCallback, type ReactElement } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { ActiveFocusBar } from '../focus/ActiveFocusBar';
import { PlannerAgentLauncher } from '../planner/PlannerAgentLauncher';
import { PlannerAgentPopup } from '../planner/PlannerAgentPopup';
import { useAuth } from '../../lib/AuthContext';
import { useT } from '../../lib/i18n/I18nContext';
import { FocusSessionProvider, useFocusSession } from '../../lib/FocusSessionContext';
import { PlannerAgentProvider } from '../../lib/PlannerAgentContext';
import { formatElapsedMs, useFocusClock } from '../../lib/focusSessionTime';
import './AppShell.css';

function AppShellHeaderFocus(): ReactElement | null {
  const focus = useFocusSession();
  const t = useT();
  const startedAt = focus.activeSession?.session.startedAt ?? null;
  const nowMs = useFocusClock(startedAt);

  if (focus.activeSession === null) {
    return null;
  }

  const elapsed = formatElapsedMs(focus.getElapsedMs(nowMs));

  const onStop = (): void => {
    focus.stopFocus().catch(() => undefined);
  };

  const onCancel = (): void => {
    focus.cancelFocus().catch(() => undefined);
  };

  const onPauseToggle = (): void => {
    if (focus.isPaused) {
      focus.resumeFocus();
      return;
    }
    focus.pauseFocus();
  };

  return (
    <div className="app-header-focus" aria-label="Active focus session">
      <span className="app-header-focus__label">{focus.isPaused ? t('focus.paused') : t('focus.label')}</span>
      <span className="app-header-focus__timer">{elapsed}</span>
      <button type="button" className="app-header-focus__pause" onClick={onPauseToggle} disabled={focus.actionLoading}>
        {focus.isPaused ? t('focus.resume') : t('focus.pause')}
      </button>
      {focus.isPaused ? (
        <button type="button" className="app-header-focus__cancel" onClick={onCancel} disabled={focus.actionLoading}>
          {t('focus.cancel')}
        </button>
      ) : null}
      <button type="button" className="app-header-focus__stop" onClick={onStop} disabled={focus.actionLoading}>
        {focus.actionLoading ? '…' : t('focus.stop')}
      </button>
    </div>
  );
}

function AppShellContent(): ReactElement {
  const auth = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const focus = useFocusSession();
  const hasActiveFocus = focus.activeSession !== null;
  const hideFocusBar =
    location.pathname === '/dashboard' || location.pathname === '/today' || location.pathname === '/tasks';
  const showFocusBar = hasActiveFocus && !hideFocusBar;

  const onLogout = useCallback((): void => {
    auth.logout();
    navigate('/login', { replace: true });
  }, [auth, navigate]);

  return (
    <div className={`app-shell ${showFocusBar ? 'app-shell--focus-active' : ''}`}>
      <div className="app-shell__main">
        <header className="app-header">
          <div className="app-toolbar">
            <h1 className="app-title">{t('app.title')}</h1>
            <AppShellHeaderFocus />
            <button type="button" className="logout-btn" onClick={onLogout}>
              {t('nav.logout')}
            </button>
          </div>
        </header>
        <div className="page-wrap">
          <Outlet />
        </div>
        {showFocusBar ? <ActiveFocusBar /> : null}
        <PlannerAgentLauncher />
        <PlannerAgentPopup />
        <nav className="app-tabs" aria-label="Main navigation">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `app-tab ${isActive ? 'app-tab--active' : ''}`}
          >
            {t('nav.home')}
          </NavLink>
          <NavLink
            to="/today"
            className={({ isActive }) => `app-tab ${isActive ? 'app-tab--active' : ''}`}
          >
            {t('nav.today')}
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) => `app-tab ${isActive ? 'app-tab--active' : ''}`}
          >
            {t('nav.tasks')}
          </NavLink>
          <NavLink
            to="/insights"
            className={({ isActive }) => `app-tab ${isActive ? 'app-tab--active' : ''}`}
          >
            {t('nav.insights')}
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => `app-tab ${isActive ? 'app-tab--active' : ''}`}
          >
            {t('nav.profile')}
          </NavLink>
        </nav>
      </div>
    </div>
  );
}

export function AppShell(): ReactElement {
  return (
    <PlannerAgentProvider>
      <FocusSessionProvider>
        <AppShellContent />
      </FocusSessionProvider>
    </PlannerAgentProvider>
  );
}
