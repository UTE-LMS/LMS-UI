import { IStatusDisplay } from '@models/common/status-display.model';
import { MeasurementRuleStatus, ReportScopeType, UnofficialReason } from '@models/measurement/report-context.model';
import { ScoreStatus } from '@models/measurement/score-status.model';
import { VerificationStatus } from '@models/measurement/verification.model';

/**
 * Văn bản và kiểu hiển thị cho dữ liệu đo lường, đặt một chỗ (rule 02: mỗi trạng thái có nhãn, kiểu riêng,
 * chú thích; không chỉ dùng màu). Giá trị enum lấy từ GiaiThich_CoSoDuLieu.md.
 */

/** Trạng thái điểm. Thiếu dữ liệu KHÔNG bao giờ hiển thị như số 0; chỉ BLANK là 0 có ghi nhận. */
export const SCORE_STATUS_DISPLAY: Record<ScoreStatus, IStatusDisplay> = {
  SCORED: {
    label: 'Đã chấm',
    description: 'Câu hỏi/tiêu chí đã được chấm; điểm là giá trị ghi nhận.',
    icon: 'fa-circle-check',
    tone: 'success',
    lineStyle: 'solid',
  },
  BLANK: {
    label: 'Bỏ trống',
    description: 'Sinh viên có dự thi nhưng bỏ trống câu này: điểm 0 có ghi nhận. Khác với thiếu dữ liệu.',
    icon: 'fa-circle-minus',
    tone: 'info',
    lineStyle: 'solid',
  },
  ABSENT: {
    label: 'Vắng',
    description: 'Sinh viên vắng cả bài: không có điểm, không được tính là 0.',
    icon: 'fa-user-slash',
    tone: 'neutral',
    lineStyle: 'dashed',
  },
  NOT_GRADED: {
    label: 'Chưa chấm',
    description: 'Bài chưa được chấm: chưa có điểm, không được tính là 0.',
    icon: 'fa-hourglass-half',
    tone: 'warning',
    lineStyle: 'dashed',
  },
  EXEMPT: {
    label: 'Được miễn',
    description: 'Sinh viên được miễn nội dung này: không có điểm, không được tính là 0.',
    icon: 'fa-file-circle-minus',
    tone: 'accent',
    lineStyle: 'dotted',
  },
  MISSING: {
    label: 'Thiếu dữ liệu',
    description: 'Dữ liệu điểm bị thiếu khi nhập: chưa đủ dữ liệu, không được tính là 0.',
    icon: 'fa-triangle-exclamation',
    tone: 'danger',
    lineStyle: 'dashed',
  },
};

/** Trạng thái xác nhận nghiệp vụ của nội dung PLO/PI/CLO và liên kết CLO–PI. */
export const VERIFICATION_DISPLAY: Record<VerificationStatus, IStatusDisplay> = {
  UNVERIFIED: {
    label: 'Chưa xác nhận',
    description: 'Nội dung này chưa được đối chiếu và xác nhận nghiệp vụ.',
    icon: 'fa-circle-question',
    tone: 'neutral',
    lineStyle: 'dashed',
  },
  NEEDS_CLARIFICATION: {
    label: 'Cần làm rõ',
    description: 'Nội dung cần được làm rõ, đối chiếu với bản gốc trước khi dùng cho kết luận chính thức.',
    icon: 'fa-circle-exclamation',
    tone: 'warning',
    lineStyle: 'dashed',
  },
  VERIFIED: {
    label: 'Đã xác nhận',
    description: 'Đã được xác nhận nghiệp vụ.',
    icon: 'fa-circle-check',
    tone: 'success',
    lineStyle: 'solid',
  },
};

/** Trạng thái quy tắc đo lường. Chỉ quy tắc CONFIRMED mới cho kết luận chính thức. */
export const RULE_STATUS_DISPLAY: Record<MeasurementRuleStatus, IStatusDisplay> = {
  DRAFT: {
    label: 'Bản nháp',
    description: 'Quy tắc còn là bản nháp, chưa được người có thẩm quyền xác nhận: kết quả chỉ để tham khảo.',
    icon: 'fa-pen-ruler',
    tone: 'warning',
    lineStyle: 'dashed',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    description: 'Quy tắc đã được người có thẩm quyền xác nhận.',
    icon: 'fa-circle-check',
    tone: 'success',
    lineStyle: 'solid',
  },
  RETIRED: {
    label: 'Đã ngưng dùng',
    description: 'Quy tắc đã ngưng dùng; báo cáo cũ vẫn truy được quy tắc đã dùng.',
    icon: 'fa-box-archive',
    tone: 'neutral',
    lineStyle: 'dotted',
  },
};

export const UNKNOWN_DISPLAY_LABEL = 'Không xác định';
export const UNKNOWN_DISPLAY_ICON = 'fa-circle-question';

export const REPORT_SCOPE_LABEL: Record<ReportScopeType, string> = {
  SECTION: 'Lớp học phần',
  COURSE: 'Học phần',
  COHORT: 'Khóa',
  PROGRAM: 'Chương trình đào tạo',
};

export const UNOFFICIAL_LABEL = 'Không chính thức';
export const UNOFFICIAL_DEFAULT_DESCRIPTION
  = 'Kết quả này chưa phải kết luận chính thức: chỉ kết quả được hệ thống xác nhận là chính thức mới được dùng làm kết luận.';

export const UNOFFICIAL_REASON_LABEL: Record<UnofficialReason, string> = {
  RULE_DRAFT: 'Quy tắc đo lường còn ở bản nháp (DRAFT).',
  RULE_NOT_CONFIRMED: 'Quy tắc đo lường chưa được xác nhận (CONFIRMED).',
  LINK_NOT_VERIFIED: 'Liên kết CLO–PI chưa được xác minh (VERIFIED).',
};

export const STALE_WARNING_TITLE = 'Điểm đã thay đổi sau lần tính';
export const STALE_WARNING_BODY = 'Kết quả này có thể đã cũ. Cần tính lại để có kết quả theo điểm mới nhất.';

/** Thang của hai loại mức khác nhau: rubric (1–4) khác Bloom (1–6), không quy đổi qua lại. */
export const RUBRIC_LEVEL_SCALE = { min: 1, max: 4 } as const;
export const BLOOM_LEVEL_SCALE = { min: 1, max: 6 } as const;

export const PLACEHOLDER = {
  /** Không có giá trị (null, thiếu): không bao giờ dùng số 0 thay thế. */
  NONE: 'Chưa có',
  /** Tỷ lệ không tính được vì không có ai đủ dữ liệu (mẫu số 0). */
  INSUFFICIENT: 'Chưa đủ dữ liệu',
  INVALID: 'Không hợp lệ',
} as const;
