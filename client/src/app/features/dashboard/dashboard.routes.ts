import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./dashboard-page/dashboard-page.component').then(
        (m) => m.DashboardPageComponent
      ),
  },
];
