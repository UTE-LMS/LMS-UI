import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';

export const sectionsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./list-sections/list-sections.component')
      .then(m => m.ListSectionsComponent),
    title: `Lớp học phần | ${SystemConstant.WEB_NAME}`,
  },
  {
    path: ':sectionId/roster-import',
    loadComponent: () => import('./roster-import/roster-import.component')
      .then(m => m.RosterImportComponent),
    title: `Nhập danh sách lớp | ${SystemConstant.WEB_NAME}`,
  },
  {
    path: ':sectionId',
    loadComponent: () => import('./detail-section/detail-section.component')
      .then(m => m.DetailSectionComponent),
    title: `Chi tiết lớp học phần | ${SystemConstant.WEB_NAME}`,
  },
];
