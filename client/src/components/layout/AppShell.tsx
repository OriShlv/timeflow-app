import { useCallback, type ReactElement } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../../lib/AuthContext';
import './AppShell.css';

export function AppShell(): ReactElement {
  const auth = useAuth();
  const navigate = useNavigate();

  const onLogout = useCallback((): void => {
    auth.logout();
    navigate('/login', { replace: true });
  }, [auth, navigate]);

  return (
    <div className="app-shell">
      <div className="app-shell__main">
        <header className="app-header">
          <div className="app-toolbar">
            <h1 className="app-title">Timeflow</h1>
            <button type="button" className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>
        <div className="page-wrap">
          <Outlet />
        </div>
        <nav className="app-tabs" aria-label="Main navigation">
          <NavLink
            to="/today"
            className={({ isActive }) => `app-tab ${isActive ? 'app-tab--active' : ''}`}
          >
            Today
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) => `app-tab ${isActive ? 'app-tab--active' : ''}`}
          >
            Tasks
          </NavLink>
          <NavLink
            to="/insights"
            className={({ isActive }) => `app-tab ${isActive ? 'app-tab--active' : ''}`}
          >
            Insights
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => `app-tab ${isActive ? 'app-tab--active' : ''}`}
          >
            Profile
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
