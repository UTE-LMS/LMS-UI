/** Phạm vi tính (GiaiThich_CoSoDuLieu.md §4.24, `calculation_runs.scope`). */
export type ReportScopeType = 'SECTION' | 'COURSE' | 'COHORT' | 'PROGRAM';

/** Trạng thái quy tắc đo lường (§4.23, `measurement_rules.status`). */
export type MeasurementRuleStatus = 'DRAFT' | 'CONFIRMED' | 'RETIRED';

/** Lý do kết quả chưa chính thức mà UI có thể nêu (F06 §Quy tắc 2). */
export type UnofficialReason = 'RULE_DRAFT' | 'RULE_NOT_CONFIRMED' | 'LINK_NOT_VERIFIED';

export interface IReportScope {
  type: ReportScopeType;
  /** Tên dễ đọc (tên lớp, học phần...) nếu API cung cấp; mã/ID chỉ là phương án cuối. */
  label?: string | null;
  refId?: string | null;
  cohort?: string | null;
  termId?: string | null;
}

export interface IReportRuleRef {
  code: string;
  version: string;
  status: MeasurementRuleStatus;
}

/** Ngữ cảnh bắt buộc đi kèm mọi báo cáo/kết quả đo lường (rule 02: phạm vi, quy tắc, phiên bản, limitations). */
export interface IReportContext {
  scope: IReportScope | null;
  rule: IReportRuleRef | null;
  programVersionId: string | null;
  runId: string | null;
  /** Thời điểm tính, ISO-8601 UTC. */
  calculatedAt: string | null;
  /** Chỉ `true` mới được gọi là chính thức; null/thiếu được coi là chưa xác định, hiển thị như không chính thức. */
  isOfficial: boolean | null;
  isStale: boolean | null;
  staleReason?: string | null;
  /** Lý do chưa chính thức bổ sung từ API (ví dụ liên kết CLO–PI chưa `VERIFIED`). */
  unofficialReasons?: UnofficialReason[] | null;
  limitations: string[] | null;
}
