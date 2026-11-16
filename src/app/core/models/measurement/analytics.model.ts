import { AssessmentType } from '@models/assessment/assessment.model';
import { ResultLevel } from '@models/measurement/measurement.model';

/** Chiều phân tích của GET /api/v1/reports/analytics (enum AnalyticsDimension, F07/US-36). */
export type AnalyticsDimension =
  | 'TIME_TERM'
  | 'COURSE_SECTIONS'
  | 'COHORT'
  | 'ASSESSMENT_COMPONENT'
  | 'CURRICULUM_CLASSIFICATION'
  | 'COURSE_LECTURER'
  | 'STUDENT';

/** Cách phân nhóm của chiều CURRICULUM_CLASSIFICATION (enum CurriculumClassificationType). */
export type CurriculumClassificationType = 'PLO_CATEGORY' | 'COURSE_TYPE' | 'BLOOM_LEVEL';

/**
 * Tham số truy vấn (AnalyticsQueryRequest, gửi dạng query string). Chỉ `dimension` bắt buộc;
 * các trường khác tùy chiều. Danh sách gửi dạng lặp khóa (`termIds=a&termIds=b`).
 */
export interface IAnalyticsQuery {
  dimension: AnalyticsDimension;
  programVersionId?: string;
  courseId?: string;
  termIds?: string[];
  sectionIds?: string[];
  cohorts?: string[];
  assessmentTypes?: AssessmentType[];
  level?: ResultLevel;
  classificationType?: CurriculumClassificationType;
  runId?: string;
  lecturerIds?: string[];
  studentIds?: string[];
}

/** Tiêu đề một hàng hoặc một cột của ma trận (MatrixHeader). */
export interface IMatrixHeader {
  id: string;
  code?: string | null;
  name?: string | null;
  bloomLevel?: number | null;
  extra?: Record<string, unknown> | null;
}

/**
 * Một ô của ma trận (MatrixMetricCell). Mọi tỷ lệ do backend tính, thang 0–1; null khi chưa có ai đủ dữ liệu.
 * UI chỉ định dạng để hiển thị, không tự chia lại.
 */
export interface IMatrixMetricCell {
  enrolled: number;
  evaluated: number;
  passed: number;
  failed: number;
  insufficientData: number;
  mean: number | null;
  passRate: number | null;
  passRateOfEnrolled: number | null;
  isOfficial: boolean;
  isStale: boolean;
}

/** AnalyticsMatrixResponse: `matrix[i][j]` là ô của hàng `rows[i]`, cột `columns[j]`. */
export interface IAnalyticsMatrix {
  dimension: AnalyticsDimension;
  level: ResultLevel | null;
  runId: string | null;
  isOfficial: boolean;
  isStale: boolean;
  columns: IMatrixHeader[];
  rows: IMatrixHeader[];
  matrix: IMatrixMetricCell[][];
}
