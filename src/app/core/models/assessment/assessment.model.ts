/**
 * Bài đánh giá, câu hỏi/tiêu chí, rubric, duyệt ma trận (F04 US-15, US-16, NEW-01).
 * Tên trường khớp DTO backend (AssessmentResponse, AssessmentItemDto, CoverageResponse...). Lưu ý: cờ khóa cấu trúc
 * trong JSON là `locked` (không phải `isLocked` như tên trường trong CSDL).
 */
export type AssessmentType = 'QUIZ' | 'PRACTICAL' | 'PROJECT' | 'MIDTERM' | 'FINAL' | 'OTHER';
export type AssessmentPhase = 'FORMATIVE' | 'MIDTERM' | 'SUMMATIVE';
/** TOTAL_ONLY: chỉ có điểm tổng nên bài này không đo được CLO/PI. */
export type DataGranularity = 'ITEM' | 'TOTAL_ONLY';
export type AssessmentStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SCORE_ENTERED' | 'LOCKED';
/** SYLLABUS_TEMPLATE: khung theo đề cương (không qua duyệt); SECTION: bản của một lớp. */
export type AssessmentScope = 'SYLLABUS_TEMPLATE' | 'SECTION';
export type ApprovalAction = 'SUBMIT' | 'APPROVE' | 'REJECT' | 'UNLOCK';
export type ItemKind = 'QUESTION' | 'CRITERION';

/** CLO mà một phần tử đo và phần điểm chia cho CLO đó, trong (0, 1]. PI không khai báo ở đây: suy ra từ CLO (ADR 0011). */
export interface IOutcomeMapping {
  cloId: string;
  weight: number;
}

/** Một mức rubric 1–4. Khác mức Bloom (1–6) và không phải điểm của sinh viên. */
export interface IRubricLevel {
  level: number;
  description?: string | null;
  score: number;
}

export interface IRubric {
  levels: IRubricLevel[];
}

export interface IAssessmentItem {
  /** Có thì giữ nguyên định danh phần tử; không có thì backend tự sinh. */
  id?: string;
  code: string;
  orderIndex?: number | null;
  title?: string | null;
  kind: ItemKind;
  maxScore: number;
  /** Mức Bloom 1–6; thiếu thì phần tử không nằm trong độ phủ theo Bloom. */
  bloomLevel?: number | null;
  topic?: string | null;
  externalRef?: string | null;
  outcomeMappings: IOutcomeMapping[];
  rubric?: IRubric | null;
}

export interface IApprovalHistoryEntry {
  action: ApprovalAction;
  /** ID người thực hiện; backend chưa trả tên đăng nhập. */
  actorId: string;
  at: string;
  note?: string | null;
}

export interface IApproval {
  submittedBy?: string | null;
  submittedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  history?: IApprovalHistoryEntry[] | null;
}

export interface ICoverageByClo {
  cloId: string;
  /** Mã CLO (CLO1...); chỉ có ở endpoint /coverage. */
  cloCode?: string | null;
  points: number;
  /** Phần trăm 0–100 so với tổng điểm các phần tử, do backend tính. */
  percentage: number;
}

export interface ICoverageByBloom {
  bloomLevel: number;
  questionCount: number;
  points: number;
  percentage: number;
}

/** Độ phủ theo CLO và Bloom do backend tính từ items; UI chỉ hiển thị, không tự tính. */
export interface ICoverage {
  totalItemsSum: number;
  byClo: ICoverageByClo[];
  byBloom: ICoverageByBloom[];
}

export interface IAssessment {
  id: string;
  syllabusId: string;
  sectionId?: string | null;
  templateId?: string | null;
  code: string;
  name: string;
  scope: AssessmentScope;
  type?: AssessmentType | null;
  phase?: AssessmentPhase | null;
  scheduledAt?: string | null;
  totalPoints?: number | null;
  weightInCourse?: number | null;
  dataGranularity: DataGranularity;
  measurableByOutcome: boolean;
  status: AssessmentStatus;
  /** true khi cấu trúc items[] bị khóa (đã duyệt trở đi). */
  locked: boolean;
  approval?: IApproval | null;
  coverageSummary?: ICoverage | null;
  items: IAssessmentItem[];
  revision?: number | null;
}

export interface IAssessmentRequest {
  code: string;
  name: string;
  type?: AssessmentType;
  phase?: AssessmentPhase;
  scheduledAt?: string;
  totalPoints?: number;
  weightInCourse?: number;
  dataGranularity?: DataGranularity;
  /** Chỉ dùng khi tạo bản lớp từ khung; khi đó không gửi items. */
  templateId?: string;
  items?: IAssessmentItem[];
}

/** Cập nhật thông tin: thay thế toàn phần, trường tùy chọn bỏ trống nghĩa là bỏ giá trị. Mã bất biến. */
export interface IAssessmentUpdateRequest {
  name: string;
  type?: AssessmentType;
  phase?: AssessmentPhase;
  scheduledAt?: string;
  totalPoints?: number;
  weightInCourse?: number;
  dataGranularity?: DataGranularity;
}

export interface IAssessmentItemsRequest {
  items: IAssessmentItem[];
}

export interface IAssessmentRejectRequest {
  reviewNote: string;
}
