import { IStatusDisplay } from '@models/common/status-display.model';
import { EnrollmentStatus, SectionStatus } from '@models/course/section.model';
import { TermStatus } from '@models/course/term.model';
import { SyllabusStatus } from '@models/course/syllabus.model';

/**
 * Nhãn trạng thái học kỳ, lớp học phần, ghi danh và đề cương, đặt một chỗ (rule 02: mỗi trạng thái có CHỮ,
 * biểu tượng và kiểu viền riêng, màu chỉ là tín hiệu thứ tư). Giá trị enum khớp backend (F05a).
 */
export const TERM_STATUS_DISPLAY: Record<TermStatus, IStatusDisplay> = {
  OPEN: {
    label: 'Đang mở',
    description: 'Học kỳ đang mở: được mở lớp, đổi danh sách ghi danh và nhập điểm.',
    icon: 'fa-lock-open',
    tone: 'success',
    lineStyle: 'solid',
  },
  SCORE_LOCKED: {
    label: 'Đã khóa sổ điểm',
    description: 'Không nhập mới và không sửa điểm của các lớp trong học kỳ; danh sách ghi danh cũng bị đóng băng.',
    icon: 'fa-lock',
    tone: 'warning',
    lineStyle: 'dashed',
  },
  CLOSED: {
    label: 'Đã đóng',
    description: 'Học kỳ đã đóng hẳn, chỉ để tra cứu.',
    icon: 'fa-box-archive',
    tone: 'neutral',
    lineStyle: 'solid',
  },
};

export const SECTION_STATUS_DISPLAY: Record<SectionStatus, IStatusDisplay> = {
  OPEN: {
    label: 'Đang mở',
    description: 'Lớp đang mở: được nhập danh sách, rút hoặc ghi danh lại sinh viên.',
    icon: 'fa-lock-open',
    tone: 'success',
    lineStyle: 'solid',
  },
  CLOSED: {
    label: 'Đã đóng',
    description: 'Lớp đã đóng: danh sách ghi danh (mẫu số của tỷ lệ đạt) bị đóng băng.',
    icon: 'fa-door-closed',
    tone: 'neutral',
    lineStyle: 'solid',
  },
  LOCKED: {
    label: 'Đã khóa sổ điểm',
    description: 'Lớp đã khóa sổ điểm: không nhập hay sửa điểm; mở lại phải nêu lý do giải trình.',
    icon: 'fa-lock',
    tone: 'warning',
    lineStyle: 'dashed',
  },
};

export const ENROLLMENT_STATUS_DISPLAY: Record<EnrollmentStatus, IStatusDisplay> = {
  ENROLLED: {
    label: 'Đang học',
    description: 'Thuộc mẫu số của tỷ lệ đạt cấp lớp.',
    icon: 'fa-user-check',
    tone: 'success',
    lineStyle: 'solid',
  },
  WITHDRAWN: {
    label: 'Đã rút',
    description: 'Đã rút khỏi lớp: giữ bản ghi để truy vết, không thuộc mẫu số.',
    icon: 'fa-user-minus',
    tone: 'neutral',
    lineStyle: 'dashed',
  },
};

export const SYLLABUS_STATUS_DISPLAY: Record<SyllabusStatus, IStatusDisplay> = {
  DRAFT: {
    label: 'Nháp',
    description: 'Đề cương chưa được Trưởng bộ môn duyệt.',
    icon: 'fa-pen-ruler',
    tone: 'warning',
    lineStyle: 'dashed',
  },
  CONFIRMED: {
    label: 'Đã duyệt',
    description: 'Đề cương đã được Trưởng bộ môn duyệt.',
    icon: 'fa-circle-check',
    tone: 'success',
    lineStyle: 'solid',
  },
  ARCHIVED: {
    label: 'Lưu trữ',
    description: 'Đề cương đã lưu trữ.',
    icon: 'fa-box-archive',
    tone: 'neutral',
    lineStyle: 'solid',
  },
};

/** Tham số truy vấn mở thẳng tab "Học kỳ" của màn Học phần & Học kỳ (F03/F05a dùng chung một màn hình học kỳ). */
export const ACADEMIC_TERMS_TAB_QUERY = { tab: 'terms' } as const;
