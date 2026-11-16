import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';

export const facultiesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./list-faculties/list-faculties.component')
      .then(m => m.ListFacultiesComponent),
    title: `Quản lý Khoa | ${SystemConstant.WEB_NAME}`,
  },
];
