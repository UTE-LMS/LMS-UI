import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IPagedResults } from '@models/common/response-data.model';
import {
  IProgramCsvImportResponse,
  IProgramVersion,
  IProgramVersionStatusUpdateRequest,
  ProgramVersionStatus,
} from '@models/program/program-version.model';
import { Observable } from 'rxjs';

export interface IProgramVersionImportMetadata {
  totalCredits?: number | null;
  durationYears?: number | null;
  applicableCohort?: string | null;
}

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

  /** Phân trang danh sách phiên bản, có thể lọc theo programId, facultyId, cohort, status, search */
  getProgramVersions(
    page: number,
    size: number,
    programId?: string,
    facultyId?: string,
    cohort?: string,
    status?: ProgramVersionStatus,
    search?: string,
  ): Observable<IPagedResults<IProgramVersion>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (programId) {
      params = params.set('programId', programId);
    }
    if (facultyId) {
      params = params.set('facultyId', facultyId);
    }
    if (cohort) {
      params = params.set('cohort', cohort);
    }
    if (status) {
      params = params.set('status', status);
    }
    const trimmed = search?.trim();
    if (trimmed) {
      params = params.set('search', trimmed);
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

  importProgramCsv(
    programId: string,
    version: string,
    file: File,
    metadata?: IProgramVersionImportMetadata,
  ): Observable<IProgramCsvImportResponse> {
    const formData = this.buildImportFormData(programId, version, file, metadata);
    return this.http.post<IProgramCsvImportResponse>(UrlConstant.API.PROGRAM_VERSION_IMPORT, formData, {
      context: this.inlineErrors(),
    });
  }

  previewImportProgramCsv(
    programId: string,
    version: string,
    file: File,
    metadata?: IProgramVersionImportMetadata,
  ): Observable<IProgramCsvImportResponse> {
    const formData = this.buildImportFormData(programId, version, file, metadata);
    return this.http.post<IProgramCsvImportResponse>(UrlConstant.API.PROGRAM_VERSION_IMPORT_PREVIEW, formData, {
      context: this.inlineErrors(),
    });
  }

  private buildImportFormData(
    programId: string,
    version: string,
    file: File,
    metadata?: IProgramVersionImportMetadata,
  ): FormData {
    const formData = new FormData();
    formData.append('programId', programId);
    formData.append('version', version);
    if (metadata?.totalCredits !== null && metadata?.totalCredits !== undefined) {
      formData.append('totalCredits', String(metadata.totalCredits));
    }
    if (metadata?.durationYears !== null && metadata?.durationYears !== undefined) {
      formData.append('durationYears', String(metadata.durationYears));
    }
    const cleanCohort = metadata?.applicableCohort?.trim();
    if (cleanCohort) {
      formData.append('applicableCohort', cleanCohort);
    }
    formData.append('file', file);
    return formData;
  }

  confirmImport(id: string): Observable<IProgramCsvImportResponse> {
    return this.http.post<IProgramCsvImportResponse>(
      UrlConstant.API.PROGRAM_VERSION_CONFIRM_IMPORT(id),
      {},
      { context: this.inlineErrors() },
    );
  }

  lockProgramVersion(id: string): Observable<IProgramVersion> {
    return this.http.put<IProgramVersion>(UrlConstant.API.PROGRAM_VERSION_LOCK(id), {}, {
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

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
