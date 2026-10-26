import { Routes } from '@angular/router';

export const authRoutes: Routes = [
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
        redirectTo: 'login',
        // TODO: redirectToFn check auth
        // redirectTo: (route) => {
        //   const authService = inject(AuthService);
        //   return authService.checkRole().pipe(
        //     map(role => {
        //       if (role === 'ADMIN') {
        //         return '/admin-panel';
        //       }
        //       return '/user-home';
        //     })
        //   );
        // },
        pathMatch: 'full',
      },
      {
        path: 'login',
        loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
      },
    ],
  },
];
