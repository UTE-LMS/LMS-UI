/**
 * Lớp học phần, ghi danh và nhập danh sách lớp (F05a US-19, US-20).
 * Tên trường khớp DTO backend: SectionResponse, EnrollmentListResponse, EnrollmentImportResponse.
 */
export type SectionStatus = 'OPEN' | 'CLOSED' | 'LOCKED';

export type EnrollmentStatus = 'ENROLLED' | 'WITHDRAWN';

export interface ISection {
  id: string;
  code: string;
  courseId: string;
  syllabusId: string;
  termId: string;
  lecturerIds: string[];
  /**
   * Sĩ số (số ENROLLED), là mẫu số của tỷ lệ đạt, do backend tính lại sau mỗi lần nhập/rút/ghi danh lại.
   * Backend mặc định 0 cho lớp mới mở nên 0 và "chưa nhập danh sách" không phân biệt được ở đây; UI hiển thị
   * "—" cho cả null lẫn 0 (xem displayEnrolledCount) và chỉ phân biệt được ở màn chi tiết lớp.
   */
  enrolledCount?: number | null;
  status: SectionStatus;
}

export interface ISectionRequest {
  code: string;
  courseId: string;
  syllabusId: string;
  termId: string;
  lecturerIds: string[];
}

export interface ISectionUpdateRequest {
  lecturerIds: string[];
}

export interface ISectionStatusUpdateRequest {
  status: SectionStatus;
  /** Bắt buộc khi mở lại lớp đang LOCKED (backend trả 422 nếu thiếu). */
  reason?: string;
}

export interface IEnrollment {
  id: string;
  sectionId: string;
  studentId: string;
  /** Mã thay thế của sinh viên (Q09): UI chỉ hiển thị mã này. */
  studentRef: string;
  cohort?: string | null;
  majorCode?: string | null;
  status: EnrollmentStatus;
  enrolledAt?: string | null;
}

export interface IEnrollmentList {
  sectionId: string;
  /** Số ENROLLED: mẫu số của tỷ lệ đạt cấp lớp (do API đếm, UI không tự cộng). */
  enrolled: number;
  /** Số WITHDRAWN: không thuộc mẫu số nhưng vẫn giữ bản ghi. */
  withdrawn: number;
  enrollments: IEnrollment[];
}

export interface IEnrollmentStatusUpdateRequest {
  status: EnrollmentStatus;
}

export interface IEnrollmentImportResult {
  sectionId: string;
  totalRows: number;
  newStudents: number;
  reusedStudents: number;
  sectionEnrolledCount: number;
  /** Tên cột trong tệp bị bỏ qua vì hệ thống không lưu (ví dụ họ tên, email). */
  ignoredColumns: string[];
}
