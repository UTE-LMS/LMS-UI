import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { canActiveGuard } from '@guards/can-active.guard';

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
  {
    path: 'versions/:versionId/edit',
    canActivate: [canActiveGuard],
    data: {
      listRoles: [SystemConstant.MNG_ROLE.PROGRAM_MANAGER],
      rolesRelation: 'OR',
    },
    loadComponent: () => import('./form-curriculum-version/form-curriculum-version.component').then(
      m => m.FormCurriculumVersionComponent,
    ),
    title: `Soạn thảo Khung CTĐT & CĐR | ${SystemConstant.WEB_NAME}`,
  },
];
