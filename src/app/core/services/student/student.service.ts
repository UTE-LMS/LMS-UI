import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS, REQUEST_TIMEOUT_MS } from '@interceptors/http-context.token';
import { ICsvImportResultResponse, IPagedResults } from '@models/common/response-data.model';
import {
  StudentBatchStatusUpdateRequest,
  StudentBatchStatusUpdateResponse,
  StudentFilter,
  StudentResponse,
  StudentStatus,
  StudentStatusUpdateRequest,
} from '@models/student/student.model';
import { ImportTemplateFormat } from '@services/common/import-file.util';
import { Observable } from 'rxjs';

/**
 * Quản lý hồ sơ sinh viên và trạng thái học tập (toàn bộ endpoint chỉ dành cho ADMIN).
 */
@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private readonly http = inject(HttpClient);

  getStudents(page = 0, size = 20, filter?: StudentFilter): Observable<IPagedResults<StudentResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    const search = filter?.search?.trim();
    if (search) {
      params = params.set('search', search);
    }
    const cohort = filter?.cohort?.trim();
    if (cohort) {
      params = params.set('cohort', cohort);
    }
    if (filter?.status) {
      params = params.set('status', filter.status);
    }

    return this.http.get<IPagedResults<StudentResponse>>(UrlConstant.API.STUDENTS, {
      params,
      context: this.inlineErrors(),
    });
  }

  downloadImportTemplate(format: ImportTemplateFormat = 'csv'): Observable<Blob> {
    return this.http.get(UrlConstant.API.STUDENT_IMPORT_TEMPLATE, {
      responseType: 'blob',
      params: new HttpParams().set('format', format),
      context: this.inlineErrors(),
    });
  }

  importStudents(file: File): Observable<ICsvImportResultResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ICsvImportResultResponse>(UrlConstant.API.STUDENT_IMPORT, formData, {
      context: this.inlineErrors().set(REQUEST_TIMEOUT_MS, 0),
    });
  }

  updateStatus(id: string, status: StudentStatus): Observable<StudentResponse> {
    const body: StudentStatusUpdateRequest = { status };
    return this.http.put<StudentResponse>(UrlConstant.API.STUDENT_STATUS(id), body, {
      context: this.inlineErrors(),
    });
  }

  batchUpdateStatus(studentIds: string[], status: StudentStatus): Observable<StudentBatchStatusUpdateResponse> {
    const body: StudentBatchStatusUpdateRequest = { studentIds, status };
    return this.http.put<StudentBatchStatusUpdateResponse>(UrlConstant.API.STUDENT_BATCH_STATUS, body, {
      context: this.inlineErrors(),
    });
  }

  downloadStatusImportTemplate(format: ImportTemplateFormat = 'csv'): Observable<Blob> {
    return this.http.get(UrlConstant.API.STUDENT_STATUS_IMPORT_TEMPLATE, {
      responseType: 'blob',
      params: new HttpParams().set('format', format),
      context: this.inlineErrors(),
    });
  }

  importStudentStatuses(file: File): Observable<ICsvImportResultResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ICsvImportResultResponse>(UrlConstant.API.STUDENT_STATUS_IMPORT, formData, {
      context: this.inlineErrors().set(REQUEST_TIMEOUT_MS, 0),
    });
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
