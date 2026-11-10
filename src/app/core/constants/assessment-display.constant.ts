import {
  ApprovalAction, AssessmentPhase, AssessmentStatus, AssessmentType, DataGranularity, ItemKind,
} from '@models/assessment/assessment.model';
import { IStatusDisplay } from '@models/common/status-display.model';

/**
 * Nhãn hiển thị cho bài đánh giá, đặt một chỗ (rule 02: mỗi trạng thái có chữ, biểu tượng, kiểu viền riêng,
 * không chỉ dùng màu). Giá trị enum khớp backend (F04). Luồng: Nháp, Đã gửi duyệt, Đã duyệt, Đã nhập điểm, Đã khóa;
 * Bị từ chối quay về Nháp để sửa.
 */
export const ASSESSMENT_STATUS_DISPLAY: Record<AssessmentStatus, IStatusDisplay> = {
  DRAFT: {
    label: 'Nháp',
    description: 'Đang soạn: sửa được cấu trúc câu hỏi/tiêu chí.',
    icon: 'fa-pen-ruler',
    tone: 'neutral',
    lineStyle: 'dashed',
  },
  SUBMITTED: {
    label: 'Đã gửi duyệt',
    description: 'Đang chờ Trưởng bộ môn duyệt ma trận; cấu trúc tạm khóa sửa.',
    icon: 'fa-paper-plane',
    tone: 'warning',
    lineStyle: 'solid',
  },
  APPROVED: {
    label: 'Đã duyệt',
    description: 'Ma trận đã được duyệt; cấu trúc bị khóa. Nhập điểm được khi bài Đã duyệt hoặc Đã nhập điểm.',
    icon: 'fa-circle-check',
    tone: 'success',
    lineStyle: 'solid',
  },
  REJECTED: {
    label: 'Bị từ chối',
    description: 'Trưởng bộ môn từ chối kèm ghi chú; sửa lại thì bài quay về Nháp để gửi duyệt lại.',
    icon: 'fa-circle-xmark',
    tone: 'danger',
    lineStyle: 'solid',
  },
  SCORE_ENTERED: {
    label: 'Đã nhập điểm',
    description: 'Đã có điểm gắn với cấu trúc này; cấu trúc bị khóa.',
    icon: 'fa-table-cells',
    tone: 'info',
    lineStyle: 'solid',
  },
  LOCKED: {
    label: 'Đã khóa',
    description: 'Đã khóa sổ; chỉ xem.',
    icon: 'fa-lock',
    tone: 'neutral',
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

export const DATA_GRANULARITY_LABEL: Record<DataGranularity, string> = {
  ITEM: 'Điểm theo từng câu/tiêu chí',
  TOTAL_ONLY: 'Chỉ có điểm tổng (không đo được CLO/PI)',
};

export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  QUESTION: 'Câu hỏi',
  CRITERION: 'Tiêu chí',
};

export const APPROVAL_ACTION_LABEL: Record<ApprovalAction, string> = {
  SUBMIT: 'Gửi duyệt',
  APPROVE: 'Duyệt',
  REJECT: 'Từ chối',
  UNLOCK: 'Mở khóa',
};

export interface ISelectOption<T extends string | number> {
  value: T;
  label: string;
}

/** Tên mức Bloom sửa đổi (1–6). Chỉ là phân loại mức tư duy, không phải điểm. */
export const BLOOM_LEVEL_OPTIONS: readonly ISelectOption<number>[] = [
  { value: 1, label: '1 · Nhớ' },
  { value: 2, label: '2 · Hiểu' },
  { value: 3, label: '3 · Áp dụng' },
  { value: 4, label: '4 · Phân tích' },
  { value: 5, label: '5 · Đánh giá' },
  { value: 6, label: '6 · Sáng tạo' },
];

export function bloomLabel(level: number): string {
  return BLOOM_LEVEL_OPTIONS.find(o => o.value === level)?.label ?? `${level}`;
}

export function toOptions<T extends string>(labels: Readonly<Record<T, string>>): ISelectOption<T>[] {
  return (Object.keys(labels) as T[]).map(value => ({ value, label: labels[value] }));
}
