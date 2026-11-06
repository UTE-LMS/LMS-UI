import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IPagedResults } from '@models/common/response-data.model';
import { IProgram, IProgramRequest } from '@models/program/program.model';
import { Observable } from 'rxjs';

/**
 * Quản trị Danh mục Chương trình Đào tạo cấp trường (F02, US-05, ADR 0005).
 * Quyền ghi (POST, PUT) dành riêng cho ADMIN.
 * Quyền đọc (GET) cho mọi vai trò đã đăng nhập.
 */
@Injectable({
  providedIn: 'root',
})
export class ProgramService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = UrlConstant.API.PROGRAMS;

  /** Phân trang danh mục CTĐT: page (từ 0), size (1..100) */
  getPrograms(page: number, size: number): Observable<IPagedResults<IProgram>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
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
