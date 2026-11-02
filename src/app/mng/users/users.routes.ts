import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';

export const usersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./list-users/list-users.component').then(m => m.ListUsersComponent),
    title: `Người dùng | ${SystemConstant.WEB_NAME}`,
  },
  {
    // Phải đặt trước ':id' để 'new' không bị hiểu là một mã người dùng
    path: 'new',
    loadComponent: () => import('./detail-users/detail-users.component').then(m => m.DetailUsersComponent),
    title: `Thêm người dùng | ${SystemConstant.WEB_NAME}`,
  },
  {
    path: ':id',
    loadComponent: () => import('./detail-users/detail-users.component').then(m => m.DetailUsersComponent),
    title: `Sửa người dùng | ${SystemConstant.WEB_NAME}`,
  },
];
