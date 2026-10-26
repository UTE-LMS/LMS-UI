import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import(`@main/main.routes`).then(m => m.mainRoutes),
    title: `${SystemConstant.WEB_NAME}`,
  },
  {
    path: 'auth',
    loadChildren: () => import(`@auth/auth.routes`).then(m => m.authRoutes),
    title: `Login | ${SystemConstant.WEB_NAME}`,
  },
  {
    path: 'mng',
    loadChildren: () => import(`@mng/mng.routes`).then(m => m.mngRoutes),
    title: `Management | ${SystemConstant.WEB_NAME}`,
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
