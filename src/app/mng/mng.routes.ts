import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { canActiveGuard } from '@guards/can-active.guard';

// Vai trò được vào khu quản lý. Chỉ để ẩn/hiện giao diện; backend vẫn kiểm tra quyền mỗi request.
const ALL_MNG_ROLES = Object.values(SystemConstant.MNG_ROLE);

export const mngRoutes: Routes = [
  {
    path: '',
    // Khung quản lý chỉ cần đã đăng nhập; quyền từng trang đặt ở route con
    canActivate: [canActiveGuard],
    loadComponent: () => import('../layout/mng/management-layout/management-layout.component')
      .then(m => m.ManagementLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        canActivate: [canActiveGuard],
        data: { listRoles: ALL_MNG_ROLES, rolesRelation: 'OR' },
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'users',
        canActivate: [canActiveGuard],
        data: { listRoles: [SystemConstant.MNG_ROLE.ADMIN], rolesRelation: 'OR' },
        loadChildren: () => import('./users/users.routes').then(m => m.usersRoutes),
      },
      {
        path: 'programs',
        canActivate: [canActiveGuard],
        data: {
          listRoles: [SystemConstant.MNG_ROLE.ADMIN],
          rolesRelation: 'OR',
        },
        loadChildren: () => import('./programs/programs.routes').then(m => m.programsRoutes),
      },
      {
        path: 'curriculum',
        canActivate: [canActiveGuard],
        data: {
          listRoles: ALL_MNG_ROLES,
          rolesRelation: 'OR',
        },
        loadChildren: () => import('./curriculum/curriculum.routes').then(m => m.curriculumRoutes),
      },
      {
        path: 'courses',
        canActivate: [canActiveGuard],
        data: {
          listRoles: ALL_MNG_ROLES,
          rolesRelation: 'OR',
        },
        loadChildren: () => import('./courses/courses.routes').then(m => m.coursesRoutes),
        title: `Danh mục Học phần & Học kỳ | ${SystemConstant.WEB_NAME}`,
      },
      {
        path: 'syllabi',
        canActivate: [canActiveGuard],
        data: {
          listRoles: ALL_MNG_ROLES,
          rolesRelation: 'OR',
        },
        loadChildren: () => import('./syllabi/syllabi.routes').then(m => m.syllabiRoutes),
        title: `Đề cương & Chuẩn đầu ra Học phần (CLO) | ${SystemConstant.WEB_NAME}`,
      },
      {
        path: 'sections',
        canActivate: [canActiveGuard],
        data: {
          listRoles: ALL_MNG_ROLES,
          rolesRelation: 'OR',
        },
        loadChildren: () => import('./sections/sections.routes').then(m => m.sectionsRoutes),
        title: `Lớp học phần | ${SystemConstant.WEB_NAME}`,
      },
      {
        path: 'assessments',
        canActivate: [canActiveGuard],
        data: {
          listRoles: ALL_MNG_ROLES,
          rolesRelation: 'OR',
        },
        loadChildren: () => import('./assessments/assessments.routes').then(m => m.assessmentsRoutes),
        title: `Bài đánh giá | ${SystemConstant.WEB_NAME}`,
      },
      {
        // Không đặt listRoles: ai đã đăng nhập cũng xem được trang giải thích này
        path: 'forbidden',
        loadComponent: () => import('./forbidden/forbidden.component').then(m => m.ForbiddenComponent),
        title: `Không có quyền | ${SystemConstant.WEB_NAME}`,
      },
    ],
  },
];
