import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../../lib/AuthContext';
import { Icon } from '../ui/Icon';
import './AppShell.css';

export function AppShell(): ReactElement {
  const auth = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const closeMenu = useCallback((): void => {
    setMenuOpen(false);
  }, []);

  const onLogout = useCallback((): void => {
    auth.logout();
    navigate('/login', { replace: true });
  }, [auth, navigate]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  return (
    <div className="app-shell">
      {menuOpen ? (
        <button
          type="button"
          className="app-shell__backdrop"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      ) : null}
      <aside className={`app-shell__menu ${menuOpen ? 'app-shell__menu--open' : ''}`}>
        <header className="app-shell__menu-header">
          <h2 className="app-shell__menu-title">Menu</h2>
        </header>
        <nav className="app-shell__menu-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `app-shell__menu-link ${isActive ? 'app-shell__menu-link--active' : ''}`
            }
            onClick={closeMenu}
          >
            <Icon name="stats-chart-outline" size={20} className={undefined} aria-hidden={true} />
            Dashboard
          </NavLink>
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `app-shell__menu-link ${isActive ? 'app-shell__menu-link--active' : ''}`
            }
            onClick={closeMenu}
          >
            <Icon name="list-outline" size={20} className={undefined} aria-hidden={true} />
            Tasks
          </NavLink>
        </nav>
      </aside>
      <div className="app-shell__main">
        <header className="app-header">
          <div className="app-toolbar">
            <button
              type="button"
              className="menu-btn"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <span className="menu-btn-icon">≡</span>
            </button>
            <h1 className="app-title">Timeflow</h1>
            <button type="button" className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>
        <div className="page-wrap">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
