import type { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../../lib/AuthContext';

export function ProtectedRoute(): ReactElement {
  const auth = useAuth();
  if (!auth.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
