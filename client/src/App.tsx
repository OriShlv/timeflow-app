import type { ReactElement } from 'react';

import { AuthProvider } from './lib/AuthContext';
import { I18nProvider } from './lib/i18n/I18nContext';
import { AppRoutes } from './AppRoutes';

export function App(): ReactElement {
  return (
    <div className="app-root">
      <AuthProvider>
        <I18nProvider>
          <AppRoutes />
        </I18nProvider>
      </AuthProvider>
    </div>
  );
}
