/**
 * Trạng thái học kỳ (F05a US-18, database_import.js §4.16).
 */
export type TermStatus = 'OPEN' | 'SCORE_LOCKED' | 'CLOSED';

export interface ITerm {
  id: string;
  code: string;
  academicYear?: string;
  startDate?: string;
  endDate?: string;
  status: TermStatus;
}

export interface ITermRequest {
  code: string;
  academicYear?: string;
  startDate?: string;
  endDate?: string;
}

export interface ITermUpdateRequest {
  academicYear?: string;
  startDate?: string;
  endDate?: string;
}

export interface ITermStatusUpdateRequest {
  status: TermStatus;
  /** Lý do giải trình bắt buộc khi mở lại học kỳ đã khóa sổ điểm (SCORE_LOCKED -> OPEN) */
  reason?: string;
}
