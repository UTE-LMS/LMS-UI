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
  IProgramCourseCsvImportResponse,
} from '@models/course/course.model';
import { map, Observable } from 'rxjs';

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

  getCourses(
    page: number,
    size: number,
    search?: string,
    facultyId?: string,
    isActive?: boolean,
  ): Observable<IPagedResults<ICourse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    const trimmed = search?.trim();
    if (trimmed) {
      params = params.set('search', trimmed);
    }
    if (facultyId) {
      params = params.set('facultyId', facultyId);
    }
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }
    return this.http.get<IPagedResults<ICourse>>(this.apiUrl, { params }).pipe(
      map(res => ({
        ...res,
        content: (res.content ?? []).map(item => this.normalizeCourse(item)),
      })),
    );
  }

  getCourseById(id: string): Observable<ICourse> {
    return this.http
      .get<ICourse>(UrlConstant.API.COURSE_DETAIL(id), {
        context: this.inlineErrors(),
      })
      .pipe(map(item => this.normalizeCourse(item)));
  }

  createCourse(model: ICourseRequest): Observable<ICourse> {
    return this.http
      .post<ICourse>(this.apiUrl, model, {
        context: this.inlineErrors(),
      })
      .pipe(map(item => this.normalizeCourse(item)));
  }

  updateCourse(id: string, model: ICourseUpdateRequest): Observable<ICourse> {
    return this.http
      .put<ICourse>(UrlConstant.API.COURSE_DETAIL(id), model, {
        context: this.inlineErrors(),
      })
      .pipe(map(item => this.normalizeCourse(item)));
  }

  deleteCourse(id: string): Observable<void> {
    return this.http.delete<void>(UrlConstant.API.COURSE_DETAIL(id), {
      context: this.inlineErrors(),
    });
  }

  downloadCoursesImportTemplate(): Observable<Blob> {
    return this.http.get(UrlConstant.API.COURSE_IMPORT_TEMPLATE, {
      responseType: 'blob',
      context: this.inlineErrors(),
    });
  }

  importCourses(file: File, facultyId?: string): Observable<ICourseImportResultResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (facultyId) {
      formData.append('facultyId', facultyId);
    }
    return this.http.post<ICourseImportResultResponse>(UrlConstant.API.COURSE_IMPORT, formData, {
      context: this.inlineErrors(),
    });
  }

  // ========== Học phần thuộc Phiên bản CTĐT (program_courses - PROGRAM_MANAGER) ==========

  getProgramCourses(
    programVersionId: string,
    semester?: number,
    type?: string,
    category?: string,
    search?: string,
  ): Observable<IProgramCourse[]> {
    let params = new HttpParams();
    if (semester !== undefined) {
      params = params.set('semester', semester.toString());
    }
    if (type) {
      params = params.set('type', type);
    }
    if (category) {
      params = params.set('category', category);
    }
    const trimmed = search?.trim();
    if (trimmed) {
      params = params.set('search', trimmed);
    }
    return this.http.get<IProgramCourse[]>(UrlConstant.API.PROGRAM_COURSES(programVersionId), { params });
  }

  getProgramCourse(programVersionId: string, courseId: string): Observable<IProgramCourse> {
    return this.http.get<IProgramCourse>(
      UrlConstant.API.PROGRAM_COURSE_DETAIL(programVersionId, courseId),
      { context: this.inlineErrors() },
    );
  }

  downloadProgramCoursesImportTemplate(programVersionId: string): Observable<Blob> {
    return this.http.get(UrlConstant.API.PROGRAM_COURSE_IMPORT_TEMPLATE(programVersionId), {
      responseType: 'blob',
      context: this.inlineErrors(),
    });
  }

  importProgramCoursesCsv(programVersionId: string, file: File): Observable<IProgramCourseCsvImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<IProgramCourseCsvImportResponse>(
      UrlConstant.API.PROGRAM_COURSE_IMPORT(programVersionId),
      formData,
      { context: this.inlineErrors() },
    );
  }

  private normalizeCourse(item: ICourse): ICourse {
    const resolvedActive = item.isActive ?? item.active;
    return resolvedActive !== undefined ? { ...item, isActive: resolvedActive } : item;
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
