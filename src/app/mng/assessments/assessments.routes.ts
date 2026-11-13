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
    title: `Xem độ phủ ma trận | ${SystemConstant.WEB_NAME}`,
  },
  {
    path: ':id/score-import',
    loadComponent: () => import('./score-import/score-import.component')
      .then(m => m.ScoreImportComponent),
    title: `Nhập điểm thi theo lô | ${SystemConstant.WEB_NAME}`,
  },
  {
    path: ':id',
    loadComponent: () => import('./detail-assessment/detail-assessment.component')
      .then(m => m.DetailAssessmentComponent),
    canDeactivate: [canDeactivate],
    title: `Chi tiết bài đánh giá | ${SystemConstant.WEB_NAME}`,
  },
];
