import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';

export const programsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./list-programs/list-programs.component')
      .then(m => m.ListProgramsComponent),
    title: `Chương trình đào tạo | ${SystemConstant.WEB_NAME}`,
  },
];
