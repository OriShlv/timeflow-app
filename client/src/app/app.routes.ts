import { Routes } from '@angular/router';

import { redirectLoggedInToDashboardGuard } from './core/auth/redirect-logged-in.guard';

export const routes: Routes = [
  {
    path: '',
    canMatch: [redirectLoggedInToDashboardGuard],
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canMatch: [redirectLoggedInToDashboardGuard],
    loadComponent: () =>
      import('./features/auth/login-page/login-page.component').then(
        (m) => m.LoginPageComponent
      ),
  },
  {
    path: 'register',
    canMatch: [redirectLoggedInToDashboardGuard],
    loadComponent: () =>
      import('./features/auth/register-page/register-page.component').then(
        (m) => m.RegisterPageComponent
      ),
  },
  {
    path: 'tasks',
    loadChildren: () =>
      import('./features/tasks/tasks.routes').then((m) => m.TASKS_ROUTES),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(
        (m) => m.DASHBOARD_ROUTES
      ),
  },
];
