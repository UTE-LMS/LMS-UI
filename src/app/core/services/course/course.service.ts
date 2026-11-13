import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IPagedResults } from '@models/common/response-data.model';
import {
  ICourse,
  ICourseImportResultResponse,
  ICourseRequest,
  ICourseUpdateRequest,
  IProgramCourse,
} from '@models/course/course.model';
import { Observable } from 'rxjs';

/**
 * Quản trị Kho Học phần cấp trường, Kế hoạch Học phần trong CTĐT và Phân công Giảng viên (F03 US-09, ADR 0010).
 */
@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = UrlConstant.API.COURSES;

  // ========== Kho Học phần cấp trường (Master Catalog - ADMIN) ==========

  getCourses(page: number, size: number, search?: string): Observable<IPagedResults<ICourse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    const trimmed = search?.trim();
    if (trimmed) {
      params = params.set('search', trimmed);
    }
    return this.http.get<IPagedResults<ICourse>>(this.apiUrl, { params });
  }

  getCourseById(id: string): Observable<ICourse> {
    return this.http.get<ICourse>(UrlConstant.API.COURSE_DETAIL(id), {
      context: this.inlineErrors(),
    });
  }

  createCourse(model: ICourseRequest): Observable<ICourse> {
    return this.http.post<ICourse>(this.apiUrl, model, {
      context: this.inlineErrors(),
    });
  }

  updateCourse(id: string, model: ICourseUpdateRequest): Observable<ICourse> {
    return this.http.put<ICourse>(UrlConstant.API.COURSE_DETAIL(id), model, {
      context: this.inlineErrors(),
    });
  }

  deleteCourse(id: string): Observable<void> {
    return this.http.delete<void>(UrlConstant.API.COURSE_DETAIL(id), {
      context: this.inlineErrors(),
    });
  }

  importCourses(file: File): Observable<ICourseImportResultResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ICourseImportResultResponse>(UrlConstant.API.COURSE_IMPORT, formData, {
      context: this.inlineErrors(),
    });
  }

  // ========== Học phần thuộc Phiên bản CTĐT (program_courses - PROGRAM_MANAGER) ==========

  getProgramCourses(programVersionId: string): Observable<IProgramCourse[]> {
    return this.http.get<IProgramCourse[]>(UrlConstant.API.PROGRAM_COURSES(programVersionId));
  }

  getProgramCourse(programVersionId: string, courseId: string): Observable<IProgramCourse> {
    return this.http.get<IProgramCourse>(
      UrlConstant.API.PROGRAM_COURSE_DETAIL(programVersionId, courseId),
      { context: this.inlineErrors() },
    );
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
