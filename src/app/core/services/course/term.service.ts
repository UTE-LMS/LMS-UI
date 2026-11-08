import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import {
  ITerm,
  ITermRequest,
  ITermStatusUpdateRequest,
  ITermUpdateRequest,
} from '@models/course/term.model';
import { Observable } from 'rxjs';

/**
 * Quản lý Danh mục Học kỳ (F05a US-18, phục vụ hiệu lực Đề cương F03 US-10).
 * Quyền ghi: ADMIN, PROGRAM_MANAGER (riêng xóa: ADMIN).
 * Quyền đọc: Mọi vai trò đã xác thực.
 */
@Injectable({
  providedIn: 'root',
})
export class TermService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = UrlConstant.API.TERMS;

  getTerms(): Observable<ITerm[]> {
    return this.http.get<ITerm[]>(this.apiUrl);
  }

  getTermById(id: string): Observable<ITerm> {
    return this.http.get<ITerm>(UrlConstant.API.TERM_DETAIL(id), {
      context: this.inlineErrors(),
    });
  }

  createTerm(model: ITermRequest): Observable<ITerm> {
    return this.http.post<ITerm>(this.apiUrl, model, {
      context: this.inlineErrors(),
    });
  }

  updateTerm(id: string, model: ITermUpdateRequest): Observable<ITerm> {
    return this.http.put<ITerm>(UrlConstant.API.TERM_DETAIL(id), model, {
      context: this.inlineErrors(),
    });
  }

  updateTermStatus(id: string, model: ITermStatusUpdateRequest): Observable<ITerm> {
    return this.http.put<ITerm>(UrlConstant.API.TERM_STATUS(id), model, {
      context: this.inlineErrors(),
    });
  }

  deleteTerm(id: string): Observable<void> {
    return this.http.delete<void>(UrlConstant.API.TERM_DETAIL(id), {
      context: this.inlineErrors(),
    });
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
