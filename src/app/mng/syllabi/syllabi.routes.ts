import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';

export const syllabiRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./list-syllabi/list-syllabi.component')
      .then(m => m.ListSyllabiComponent),
    title: `Đề cương & Chuẩn đầu ra Học phần (CLO) | ${SystemConstant.WEB_NAME}`,
  },
  {
    path: ':syllabusId',
    loadComponent: () => import('./detail-syllabus/detail-syllabus.component')
      .then(m => m.DetailSyllabusComponent),
    title: `Chi tiết Đề cương & CLO | ${SystemConstant.WEB_NAME}`,
  },
];
