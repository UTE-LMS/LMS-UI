import { Routes } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { canDeactivate } from '@guards/deactivate.guard';

export const assessmentsRoutes: Routes = [
  {
    path: 'sections/:sectionId',
    loadComponent: () => import('./list-assessments/list-assessments.component')
      .then(m => m.ListAssessmentsComponent),
    title: `Bài đánh giá của lớp | ${SystemConstant.WEB_NAME}`,
  },
  {
    path: 'syllabi/:syllabusId',
    loadComponent: () => import('./list-assessments/list-assessments.component')
      .then(m => m.ListAssessmentsComponent),
    title: `Khung bài đánh giá | ${SystemConstant.WEB_NAME}`,
  },
  {
    path: ':id/review',
    loadComponent: () => import('./review-assessment/review-assessment.component')
      .then(m => m.ReviewAssessmentComponent),
    title: `Duyệt ma trận đề thi | ${SystemConstant.WEB_NAME}`,
  },
  {
    path: ':id',
    loadComponent: () => import('./detail-assessment/detail-assessment.component')
      .then(m => m.DetailAssessmentComponent),
    canDeactivate: [canDeactivate],
    title: `Soạn bài đánh giá | ${SystemConstant.WEB_NAME}`,
  },
];
