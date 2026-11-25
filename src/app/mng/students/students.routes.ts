import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';

export const studentsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./list-students/list-students.component').then(m => m.ListStudentsComponent),
    title: `Quản lý Sinh viên | ${SystemConstant.WEB_NAME}`,
  },
];
