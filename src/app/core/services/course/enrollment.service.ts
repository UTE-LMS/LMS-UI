import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS, REQUEST_TIMEOUT_MS } from '@interceptors/http-context.token';
import {
  EnrollmentStatus,
  IEnrollment,
  IEnrollmentImportResult,
  IEnrollmentList,
  IEnrollmentStatusUpdateRequest,
} from '@models/course/section.model';
import { Observable } from 'rxjs';

/**
 * Ghi danh sinh viên vào lớp (F05a US-20). Số ghi danh là mẫu số của tỷ lệ đạt nên danh sách chỉ đổi được khi
 * lớp và học kỳ còn OPEN (backend trả 422 nếu không); UI chỉ hiển thị kết quả, không tự tính sĩ số.
 */
@Injectable({
  providedIn: 'root',
})
export class EnrollmentService {
  private readonly http = inject(HttpClient);

  getEnrollments(sectionId: string, status?: EnrollmentStatus): Observable<IEnrollmentList> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<IEnrollmentList>(UrlConstant.API.SECTION_ENROLLMENTS(sectionId), {
      params,
      context: this.inlineErrors(),
    });
  }

  /**
   * Nhập danh sách lớp từ CSV (multipart, trường `file`). Là một thao tác thống nhất: có dòng lỗi thì backend
   * không ghi gì và trả 422 kèm `fieldErrors[]` theo dòng ("line N"). Tắt hết-thời-gian mặc định vì tệp có thể lớn.
   */
  importEnrollments(sectionId: string, file: File): Observable<IEnrollmentImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<IEnrollmentImportResult>(UrlConstant.API.SECTION_ENROLLMENT_IMPORT(sectionId), formData, {
      context: this.inlineErrors().set(REQUEST_TIMEOUT_MS, 0),
    });
  }

  /** Rút khỏi lớp (WITHDRAWN) hoặc ghi danh lại (ENROLLED). */
  updateStatus(id: string, status: EnrollmentStatus): Observable<IEnrollment> {
    const body: IEnrollmentStatusUpdateRequest = { status };
    return this.http.put<IEnrollment>(UrlConstant.API.ENROLLMENT_STATUS(id), body, {
      context: this.inlineErrors(),
    });
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
