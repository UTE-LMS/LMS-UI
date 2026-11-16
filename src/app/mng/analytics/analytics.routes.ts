import { Routes } from '@angular/router';

export const analyticsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./analytics-page.component').then(m => m.AnalyticsPageComponent),
  },
];
