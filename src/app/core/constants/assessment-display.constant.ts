import {
  AssessmentPhase, AssessmentStatus, AssessmentType,
} from '@models/assessment/assessment.model';
import { ImportBatchStatus } from '@models/assessment/score-import.model';
import { IStatusDisplay } from '@models/common/status-display.model';

/**
 * Nhãn hiển thị cho bài đánh giá (ADR 0014, Schema v0.7).
 * Giá trị enum khớp backend (F04). Luồng: Nháp (DRAFT) -> Đã khóa (LOCKED) -> Đã nhập điểm (SCORE_ENTERED).
 */
export const ASSESSMENT_STATUS_DISPLAY: Record<AssessmentStatus, IStatusDisplay> = {
  DRAFT: {
    label: 'Bản nháp',
    description: 'Đang soạn thảo câu hỏi, điểm tối đa và trọng số CLO.',
    icon: 'fa-pen-ruler',
    tone: 'neutral',
    lineStyle: 'dashed',
  },
  LOCKED: {
    label: 'Đã khóa ma trận',
    description: 'Ma trận câu hỏi đã khóa; sẵn sàng nhập điểm. Có thể mở lại nếu chưa nhập điểm.',
    icon: 'fa-lock',
    tone: 'success',
    lineStyle: 'solid',
  },
  SCORE_ENTERED: {
    label: 'Đã nhập điểm',
    description: 'Đã có điểm sinh viên trong hệ thống; ma trận được khóa cố định.',
    icon: 'fa-table-cells',
    tone: 'info',
    lineStyle: 'solid',
  },
};

export const ASSESSMENT_TYPE_LABEL: Record<AssessmentType, string> = {
  QUIZ: 'Kiểm tra nhanh',
  PRACTICAL: 'Thực hành',
  PROJECT: 'Đồ án / dự án',
  MIDTERM: 'Giữa kỳ',
  FINAL: 'Cuối kỳ',
  OTHER: 'Khác',
};

export const ASSESSMENT_PHASE_LABEL: Record<AssessmentPhase, string> = {
  FORMATIVE: 'Quá trình',
  MIDTERM: 'Giữa kỳ',
  SUMMATIVE: 'Tổng kết',
};

export interface ISelectOption<T extends string | number> {
  value: T;
  label: string;
}

/** Tên mức Bloom (1–6). Phân loại mức tư duy. */
export const BLOOM_LEVEL_OPTIONS: readonly ISelectOption<number>[] = [
  { value: 1, label: '1 · Nhớ' },
  { value: 2, label: '2 · Hiểu' },
  { value: 3, label: '3 · Vận dụng' },
  { value: 4, label: '4 · Phân tích' },
  { value: 5, label: '5 · Đánh giá' },
  { value: 6, label: '6 · Sáng tạo' },
];

export function bloomLabel(level: number): string {
  return BLOOM_LEVEL_OPTIONS.find(o => o.value === level)?.label ?? `${level}`;
}

/**
 * Trạng thái lần nhập điểm (ImportBatchStatus). Quy tắc lấy từ ImportBatchServiceImpl:
 * chỉ VALIDATED mới lưu được; CONFIRMED và ROLLED_BACK không hủy được nữa.
 */
export const IMPORT_BATCH_STATUS_DISPLAY: Record<ImportBatchStatus, IStatusDisplay> = {
  UPLOADED: {
    label: 'Đã tải lên',
    description: 'Tệp đã tải lên, chưa kiểm tra. Chưa có điểm nào được ghi.',
    icon: 'fa-cloud-arrow-up',
    tone: 'neutral',
    lineStyle: 'dashed',
  },
  VALIDATED: {
    label: 'Hợp lệ, chờ lưu',
    description: 'Tệp không có lỗi. Bấm Lưu để ghi điểm vào hệ thống.',
    icon: 'fa-circle-check',
    tone: 'info',
    lineStyle: 'solid',
  },
  HAS_ERRORS: {
    label: 'Có lỗi, chưa lưu',
    description: 'Tệp còn dòng lỗi nên không lưu được, kể cả các dòng hợp lệ. Sửa tệp rồi nhập lại.',
    icon: 'fa-triangle-exclamation',
    tone: 'danger',
    lineStyle: 'solid',
  },
  CONFIRMED: {
    label: 'Đã lưu',
    description: 'Điểm đã được ghi. Không hủy được; muốn đổi điểm thì nhập tệp mới.',
    icon: 'fa-lock',
    tone: 'success',
    lineStyle: 'solid',
  },
  ROLLED_BACK: {
    label: 'Đã hủy',
    description: 'Lần nhập đã hủy trước khi lưu; không có điểm nào được ghi.',
    icon: 'fa-ban',
    tone: 'neutral',
    lineStyle: 'dotted',
  },
};

export function toOptions<T extends string>(labels: Readonly<Record<T, string>>): ISelectOption<T>[] {
  return (Object.keys(labels) as T[]).map(value => ({ value, label: labels[value] }));
}
