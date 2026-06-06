import type { ReactElement } from 'react';

import { AuthProvider } from './lib/AuthContext';
import { AppRoutes } from './AppRoutes';

export function App(): ReactElement {
  return (
    <div className="app-root">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </div>
  );
}
