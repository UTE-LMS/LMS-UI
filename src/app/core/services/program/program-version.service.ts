import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IPagedResults } from '@models/common/response-data.model';
import {
  IProgramCsvImportResponse,
  IProgramVersion,
  IProgramVersionStatusUpdateRequest,
} from '@models/program/program-version.model';
import { Observable } from 'rxjs';

/**
 * Quản lý Phiên bản CTĐT (F02, ADR 0005, ADR 0014).
 * Import CSV & đổi trạng thái: PROGRAM_MANAGER trong scope.
 * Đọc: Mọi vai trò đã đăng nhập.
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

  downloadImportTemplate(): Observable<Blob> {
    return this.http.get(UrlConstant.API.PROGRAM_VERSION_IMPORT_TEMPLATE, {
      responseType: 'blob',
      context: this.inlineErrors(),
    });
  }

  importProgramCsv(programId: string, version: string, file: File): Observable<IProgramCsvImportResponse> {
    const formData = new FormData();
    formData.append('programId', programId);
    formData.append('version', version);
    formData.append('file', file);
    return this.http.post<IProgramCsvImportResponse>(UrlConstant.API.PROGRAM_VERSION_IMPORT, formData, {
      context: this.inlineErrors(),
    });
  }

  confirmImport(id: string): Observable<IProgramCsvImportResponse> {
    return this.http.post<IProgramCsvImportResponse>(
      UrlConstant.API.PROGRAM_VERSION_CONFIRM_IMPORT(id),
      {},
      { context: this.inlineErrors() },
    );
  }

  updateProgramVersionStatus(
    id: string,
    model: IProgramVersionStatusUpdateRequest,
  ): Observable<IProgramVersion> {
    return this.http.put<IProgramVersion>(UrlConstant.API.PROGRAM_VERSION_STATUS(id), model, {
      context: this.inlineErrors(),
    });
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
