import { Routes } from '@angular/router';

export const calculationsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./calculations-page.component').then(m => m.CalculationsPageComponent),
  },
];
