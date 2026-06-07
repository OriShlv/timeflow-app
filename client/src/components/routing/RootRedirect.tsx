import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../../lib/AuthContext';

export function RootRedirect(): ReactElement {
  const auth = useAuth();
  return <Navigate to={auth.isLoggedIn() ? '/dashboard' : '/login'} replace />;
}
