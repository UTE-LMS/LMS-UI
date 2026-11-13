import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IPagedResults } from '@models/common/response-data.model';
import {
  IAssignCourseRequest,
  ICourse,
  ICourseImportResultResponse,
  ICourseRequest,
  ICourseUpdateRequest,
  IProgramCourse,
  IProgramCourseRequest,
  IProgramCourseUpdateRequest,
} from '@models/course/course.model';
import { IUser } from '@models/user/user.model';
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

  addCourseToProgramVersion(
    programVersionId: string,
    model: IProgramCourseRequest,
  ): Observable<IProgramCourse> {
    return this.http.post<IProgramCourse>(
      UrlConstant.API.PROGRAM_COURSES(programVersionId),
      model,
      { context: this.inlineErrors() },
    );
  }

  updateProgramCourse(
    programVersionId: string,
    courseId: string,
    model: IProgramCourseUpdateRequest,
  ): Observable<IProgramCourse> {
    return this.http.put<IProgramCourse>(
      UrlConstant.API.PROGRAM_COURSE_DETAIL(programVersionId, courseId),
      model,
      { context: this.inlineErrors() },
    );
  }

  removeCourseFromProgramVersion(programVersionId: string, courseId: string): Observable<void> {
    return this.http.delete<void>(
      UrlConstant.API.PROGRAM_COURSE_DETAIL(programVersionId, courseId),
      { context: this.inlineErrors() },
    );
  }

  // ========== Phân công Giảng viên biên soạn Đề cương (ADR 0014 - PROGRAM_MANAGER) ==========

  getDepartmentLecturers(courseId?: string): Observable<IUser[]> {
    let params = new HttpParams();
    const trimmed = courseId?.trim();
    if (trimmed) {
      params = params.set('courseId', trimmed);
    }
    return this.http.get<IUser[]>(UrlConstant.API.DEPARTMENT_LECTURERS, {
      params,
      context: this.inlineErrors(),
    });
  }

  assignCourseToLecturer(model: IAssignCourseRequest): Observable<IUser> {
    return this.http.post<IUser>(UrlConstant.API.DEPARTMENT_ASSIGN_COURSE, model, {
      context: this.inlineErrors(),
    });
  }

  unassignCourseFromLecturer(model: IAssignCourseRequest): Observable<IUser> {
    return this.http.post<IUser>(UrlConstant.API.DEPARTMENT_UNASSIGN_COURSE, model, {
      context: this.inlineErrors(),
    });
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
