import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';

export const curriculumRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./list-curriculum-versions/list-curriculum-versions.component').then(
      m => m.ListCurriculumVersionsComponent,
    ),
    title: `Danh sách phiên bản CTĐT | ${SystemConstant.WEB_NAME}`,
  },
  {
    path: 'versions/:versionId',
    loadComponent: () => import('./detail-curriculum-version/detail-curriculum-version.component').then(
      m => m.DetailCurriculumVersionComponent,
    ),
    title: `Khung Chuẩn đầu ra PLO · PI | ${SystemConstant.WEB_NAME}`,
  },
];
