import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../layout/main/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
      {
        path: 'login',
        loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
      },
      {
        // Không dùng canActiveGuard: guard đó đẩy tài khoản còn cờ đổi mật khẩu về chính trang này (vòng lặp).
        // Component tự kiểm tra phiên.
        path: 'change-password',
        loadComponent: () => import('./change-password/change-password.component').then(m => m.ChangePasswordComponent),
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
