import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { canActiveGuard } from '@guards/can-active.guard';

// Vai trò được vào khu quản lý. Chỉ để ẩn/hiện giao diện; backend vẫn kiểm tra quyền mỗi request.
const ALL_MNG_ROLES = Object.values(SystemConstant.MNG_ROLE);

export const mngRoutes: Routes = [
  {
    path: '',
    // Khung quản lý chỉ cần đã đăng nhập; quyền từng trang đặt ở route con
    canActivate: [canActiveGuard],
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
        canActivate: [canActiveGuard],
        data: { listRoles: ALL_MNG_ROLES, rolesRelation: 'OR' },
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'users',
        canActivate: [canActiveGuard],
        data: { listRoles: [SystemConstant.MNG_ROLE.ADMIN], rolesRelation: 'OR' },
        loadChildren: () => import('./users/users.routes').then(m => m.usersRoutes),
      },
      {
        // Không đặt listRoles: ai đã đăng nhập cũng xem được trang giải thích này
        path: 'forbidden',
        loadComponent: () => import('./forbidden/forbidden.component').then(m => m.ForbiddenComponent),
        title: `Không có quyền | ${SystemConstant.WEB_NAME}`,
      },
    ],
  },
];
