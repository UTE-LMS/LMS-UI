import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import {
  ISyllabus,
  ISyllabusRequest,
  ISyllabusStatusUpdateRequest,
  SyllabusStatus,
} from '@models/course/syllabus.model';
import { Observable } from 'rxjs';

/**
 * Quản lý Phiên bản Đề cương Học phần (F03 US-10, ADR 0010).
 * Tạo đề cương DRAFT: LECTURER / DEPARTMENT_HEAD trong scope.courseIds hoặc ADMIN.
 * Phê duyệt CONFIRMED / ARCHIVED: DEPARTMENT_HEAD trong scope.courseIds hoặc ADMIN.
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

  createSyllabus(courseId: string, model: ISyllabusRequest): Observable<ISyllabus> {
    return this.http.post<ISyllabus>(UrlConstant.API.COURSE_SYLLABI(courseId), model, {
      context: this.inlineErrors(),
    });
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
