import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';

export const coursesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./list-courses/list-courses.component')
      .then(m => m.ListCoursesComponent),
    title: `Danh mục Học phần & Học kỳ | ${SystemConstant.WEB_NAME}`,
  },
];
