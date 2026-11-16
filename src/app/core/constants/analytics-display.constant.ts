import { AuditAction } from '@models/common/audit-log.model';
import { AnalyticsDimension, CurriculumClassificationType } from '@models/measurement/analytics.model';
import { ResultLevel } from '@models/measurement/measurement.model';

/** Nhãn và mô tả 7 chiều phân tích (F07). Mô tả bám chú thích của enum AnalyticsDimension. */
export const ANALYTICS_DIMENSION_DISPLAY: Record<AnalyticsDimension, { label: string; hint: string; }> = {
  TIME_TERM: { label: 'Theo học kỳ', hint: 'Xu hướng của cùng học phần qua các học kỳ.' },
  COURSE_SECTIONS: { label: 'So sánh các lớp', hint: 'Các lớp của một học phần đặt cạnh nhau.' },
  COHORT: { label: 'Theo khóa', hint: 'Đối sánh giữa các khóa tuyển sinh.' },
  ASSESSMENT_COMPONENT: { label: 'Theo thành phần đánh giá', hint: 'Giữa kỳ, cuối kỳ, thực hành, đồ án…' },
  CURRICULUM_CLASSIFICATION: { label: 'Theo phân loại CTĐT', hint: 'Nhóm PLO, loại học phần hoặc mức Bloom.' },
  COURSE_LECTURER: { label: 'Theo giảng viên', hint: 'Cùng học phần, khác giảng viên phụ trách.' },
  STUDENT: { label: 'Theo sinh viên', hint: 'Kết quả chi tiết của từng sinh viên (mã thay thế).' },
};

export const RESULT_LEVEL_LABEL: Record<ResultLevel, string> = {
  PLO: 'PLO',
  PI: 'PI',
  CLO: 'CLO',
  ASSESSMENT_CLO: 'CLO theo bài',
};

export const CLASSIFICATION_TYPE_LABEL: Record<CurriculumClassificationType, string> = {
  PLO_CATEGORY: 'Nhóm PLO',
  COURSE_TYPE: 'Loại học phần',
  BLOOM_LEVEL: 'Mức Bloom',
};

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  LOGIN: 'Đăng nhập',
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
  STATUS_CHANGE: 'Đổi trạng thái',
  IMPORT: 'Import CSV',
  SCORE_UPDATE: 'Sửa điểm',
  IMPORT_CONFIRM: 'Xác nhận nhập tệp',
  ASSESSMENT_LOCK: 'Khóa ma trận bài',
  ASSESSMENT_UNLOCK: 'Mở khóa ma trận bài',
  RUN_CALCULATION: 'Chạy tính kết quả',
};
