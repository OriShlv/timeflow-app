import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { RedirectIfLoggedIn } from './components/routing/RedirectIfLoggedIn';
import { RootRedirect } from './components/routing/RootRedirect';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { TodayPage } from './pages/TodayPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { TasksPage } from './pages/TasksPage';

export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route element={<RedirectIfLoggedIn />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/insights" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
