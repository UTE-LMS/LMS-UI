import { Routes } from '@angular/router';

export const mngRoutes: Routes = [
  {
    path: '',
    // canActivate: [canActiveGuard],
    // data: {
    //   listRoles: Object.values(SystemConstant.MNG_ROLE), // All management roles had defined
    //   rolesRelation: 'OR',
    //   fallbackUrl: UrlConstant.ROUTE.AUTH.LOGIN
    // },
    loadComponent: () => import('../layout/mng/management-layout/management-layout.component')
      .then(m => m.ManagementLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
    ],
  },
];
