import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import {
  ISyllabus,
  ISyllabusCsvImportResponse,
  ISyllabusStatusUpdateRequest,
  SyllabusStatus,
} from '@models/course/syllabus.model';
import { Observable } from 'rxjs';

/**
 * Quản lý Phiên bản Đề cương Học phần (F03 US-10, ADR 0014).
 * Import CSV & phê duyệt CONFIRMED / ARCHIVED: PROGRAM_MANAGER trong scope.
 */
@Injectable({
  providedIn: 'root',
})
export class SyllabusService {
  private readonly http = inject(HttpClient);

  getSyllabiByCourse(courseId: string): Observable<ISyllabus[]> {
    return this.http.get<ISyllabus[]>(UrlConstant.API.COURSE_SYLLABI(courseId));
  }

  getSyllabusById(id: string): Observable<ISyllabus> {
    return this.http.get<ISyllabus>(UrlConstant.API.SYLLABUS_DETAIL(id), {
      context: this.inlineErrors(),
    });
  }

  downloadImportTemplate(courseId: string): Observable<Blob> {
    return this.http.get(UrlConstant.API.COURSE_SYLLABI_IMPORT_TEMPLATE(courseId), {
      responseType: 'blob',
      context: this.inlineErrors(),
    });
  }

  importSyllabusCsv(
    courseId: string,
    version: string,
    programVersionId: string,
    file: File,
    effectiveFromTermId?: string | null,
  ): Observable<ISyllabusCsvImportResponse> {
    const formData = new FormData();
    formData.append('version', version);
    formData.append('programVersionId', programVersionId);
    if (effectiveFromTermId) {
      formData.append('effectiveFromTermId', effectiveFromTermId);
    }
    formData.append('file', file);
    return this.http.post<ISyllabusCsvImportResponse>(
      UrlConstant.API.COURSE_SYLLABI_IMPORT(courseId),
      formData,
      { context: this.inlineErrors() },
    );
  }

  confirmImport(id: string): Observable<ISyllabusCsvImportResponse> {
    return this.http.post<ISyllabusCsvImportResponse>(
      UrlConstant.API.SYLLABUS_CONFIRM_IMPORT(id),
      {},
      { context: this.inlineErrors() },
    );
  }

  updateSyllabusStatus(id: string, status: SyllabusStatus): Observable<ISyllabus> {
    const body: ISyllabusStatusUpdateRequest = { status };
    return this.http.put<ISyllabus>(UrlConstant.API.SYLLABUS_STATUS(id), body, {
      context: this.inlineErrors(),
    });
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
