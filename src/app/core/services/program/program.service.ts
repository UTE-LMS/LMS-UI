import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IPagedResults } from '@models/common/response-data.model';
import { IProgram, IProgramRequest } from '@models/program/program.model';
import { Observable } from 'rxjs';

/**
 * Quản trị Danh mục Chương trình Đào tạo (F02, US-05, ADR 0005).
 * Quyền ghi (POST, PUT) dành cho PROGRAM_MANAGER trong phạm vi Khoa được phân công.
 * Quyền đọc (GET) cho các vai trò được phép (ADMIN chỉ đọc).
 */
@Injectable({
  providedIn: 'root',
})
export class ProgramService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = UrlConstant.API.PROGRAMS;

  /** Phân trang danh mục CTĐT: page (từ 0), size (1..100), hỗ trợ lọc theo Khoa, bậc, hệ và từ khóa */
  getPrograms(
    page: number,
    size: number,
    facultyId?: string,
    level?: string,
    degree?: string,
    search?: string,
  ): Observable<IPagedResults<IProgram>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (facultyId) {
      params = params.set('facultyId', facultyId);
    }
    if (level) {
      params = params.set('level', level);
    }
    if (degree) {
      params = params.set('degree', degree);
    }
    const trimmed = search?.trim();
    if (trimmed) {
      params = params.set('search', trimmed);
    }
    return this.http.get<IPagedResults<IProgram>>(this.apiUrl, { params });
  }

  getProgramById(id: string): Observable<IProgram> {
    return this.http.get<IProgram>(`${this.apiUrl}/${id}`, { context: this.inlineErrors() });
  }

  createProgram(model: IProgramRequest): Observable<IProgram> {
    return this.http.post<IProgram>(this.apiUrl, model, { context: this.inlineErrors() });
  }

  updateProgram(id: string, model: IProgramRequest): Observable<IProgram> {
    return this.http.put<IProgram>(`${this.apiUrl}/${id}`, model, { context: this.inlineErrors() });
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
