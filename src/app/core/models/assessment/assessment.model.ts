/**
 * Bài đánh giá, câu hỏi, trọng số CLO và khóa ma trận (ADR 0014, Schema v0.7).
 * Tên trường khớp DTO backend (AssessmentResponse, AssessmentItemDto, CoverageResponse...).
 */
export type AssessmentType = 'QUIZ' | 'PRACTICAL' | 'PROJECT' | 'MIDTERM' | 'FINAL' | 'OTHER';
export type AssessmentPhase = 'FORMATIVE' | 'MIDTERM' | 'SUMMATIVE';
export type AssessmentStatus = 'DRAFT' | 'LOCKED' | 'SCORE_ENTERED';
/** SYLLABUS_TEMPLATE: khung theo đề cương; SECTION: bản của một lớp. */
export type AssessmentScope = 'SYLLABUS_TEMPLATE' | 'SECTION';

/** CLO mà một câu hỏi đo và điểm tối đa dành cho CLO đó (v0.7). */
export interface IOutcomeMapping {
  cloId: string;
  maxScore: number;
}

/** Tỷ lệ % đóng góp W_{p,j} của bài kiểm tra cho CLO (trong (0, 1]). */
export interface IAssessmentCloWeight {
  cloId: string;
  weight: number;
}

export interface IAssessmentItem {
  id?: string;
  code: string;
  orderIndex?: number | null;
  /** Mức Bloom 1–6 (bắt buộc theo v0.7). */
  bloomLevel: number;
  outcomeMappings: IOutcomeMapping[];
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

/** Độ phủ theo CLO và Bloom do backend tính từ items; UI chỉ hiển thị. */
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
  status: AssessmentStatus;
  /** true khi cấu trúc items[] bị khóa (LOCKED hoặc SCORE_ENTERED). */
  locked: boolean;
  cloWeights: IAssessmentCloWeight[];
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
  /** Chỉ dùng khi tạo bản lớp từ khung; khi đó không gửi items. */
  templateId?: string;
  cloWeights?: IAssessmentCloWeight[];
  items?: IAssessmentItem[];
}

/** Cập nhật thông tin chung bài đánh giá. Mã bất biến. */
export interface IAssessmentUpdateRequest {
  name: string;
  type?: AssessmentType;
  phase?: AssessmentPhase;
  scheduledAt?: string;
  cloWeights?: IAssessmentCloWeight[];
}

export interface IAssessmentItemsRequest {
  items: IAssessmentItem[];
}
