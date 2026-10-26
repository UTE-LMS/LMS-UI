import { Routes } from '@angular/router';

export const mainRoutes: Routes = [
  // {
  //   path: '',
  //   loadChildren: () => import('./homepage/homepage.module').then(m => m.HomePageModule),
  //   title: `Home | ${SystemConstant.WEB_NAME}`
  // },
  {
    path: '',
    loadComponent: () => import('../layout/main/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./home/homepage/homepage.component').then(m => m.HomepageComponent),
      },
      // {
      //   path: '',
      //   redirectTo: '',
      //   pathMatch: 'full'
      // },
      // {
      //   path: 'hv',
      //   children: hocVienThsRoutes,
      //   title: `Học viên | ${SystemConstant.WEB_NAME}`,
      //   canActivate: [canActiveGuard],
      //   data: {
      //     listRoles: [SystemConstant.ROLE.STUDENT],
      //     rolesRelation: 'OR',
      //     fallbackUrl: UrlConstant.ROUTE.AUTH.LOGIN
      //   },
      // },
    ],
  },
];
