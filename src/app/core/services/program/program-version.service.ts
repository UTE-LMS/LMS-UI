import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IPagedResults } from '@models/common/response-data.model';
import {
  IProgramVersion,
  IProgramVersionRequest,
  IProgramVersionStatusUpdateRequest,
  IProgramVersionUpdateRequest,
} from '@models/program/program-version.model';
import { IVerificationRequest } from '@models/program/program-verification.model';
import { Observable } from 'rxjs';

/**
 * Quản lý Phiên bản CTĐT (F02, US-05, ADR 0005).
 * Quyền tạo/sửa: PROGRAM_MANAGER trong scope.
 * Đọc: Mọi vai trò đã đăng nhập.
 * Duyệt: QA.
 */
@Injectable({
  providedIn: 'root',
})
export class ProgramVersionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = UrlConstant.API.PROGRAM_VERSIONS;

  /** Phân trang danh sách phiên bản, có thể lọc theo programId */
  getProgramVersions(
    page: number,
    size: number,
    programId?: string,
  ): Observable<IPagedResults<IProgramVersion>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (programId) {
      params = params.set('programId', programId);
    }
    return this.http.get<IPagedResults<IProgramVersion>>(this.apiUrl, { params });
  }

  getProgramVersionById(id: string): Observable<IProgramVersion> {
    return this.http.get<IProgramVersion>(UrlConstant.API.PROGRAM_VERSION_DETAIL(id), {
      context: this.inlineErrors(),
    });
  }

  createProgramVersion(model: IProgramVersionRequest): Observable<IProgramVersion> {
    return this.http.post<IProgramVersion>(this.apiUrl, model, {
      context: this.inlineErrors(),
    });
  }

  updateProgramVersion(id: string, model: IProgramVersionUpdateRequest): Observable<IProgramVersion> {
    return this.http.put<IProgramVersion>(UrlConstant.API.PROGRAM_VERSION_DETAIL(id), model, {
      context: this.inlineErrors(),
    });
  }

  updateProgramVersionStatus(
    id: string,
    model: IProgramVersionStatusUpdateRequest,
  ): Observable<IProgramVersion> {
    return this.http.put<IProgramVersion>(UrlConstant.API.PROGRAM_VERSION_STATUS(id), model, {
      context: this.inlineErrors(),
    });
  }

  verifyProgramVersion(id: string, model: IVerificationRequest): Observable<IProgramVersion> {
    return this.http.put<IProgramVersion>(UrlConstant.API.PROGRAM_VERSION_VERIFY(id), model, {
      context: this.inlineErrors(),
    });
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
