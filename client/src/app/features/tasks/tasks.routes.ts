import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guard';

export const TASKS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./tasks-page/tasks-page.component').then(
        (m) => m.TasksPageComponent
      ),
  },
];
