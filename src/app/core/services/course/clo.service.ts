import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import {
  IClo,
  ICloPiLink,
  ICloPiLinkRequest,
  ICloPiMatrix,
  ICloRequest,
  ICloUpdateRequest,
} from '@models/course/clo.model';
import { IVerificationRequest } from '@models/program/program-verification.model';
import { Observable } from 'rxjs';

/**
 * Quản lý Chuẩn đầu ra Học phần (CLO), Liên kết CLO–PI và Thẩm định ĐBCL (F03 US-11, US-12, ADR 0010, ADR 0004).
 */
@Injectable({
  providedIn: 'root',
})
export class CloService {
  private readonly http = inject(HttpClient);

  // ========== Chuẩn đầu ra Học phần (CLO) ==========

  getClosBySyllabus(syllabusId: string): Observable<IClo[]> {
    return this.http.get<IClo[]>(UrlConstant.API.SYLLABUS_CLOS(syllabusId));
  }

  getCloById(id: string): Observable<IClo> {
    return this.http.get<IClo>(UrlConstant.API.CLO_DETAIL(id), {
      context: this.inlineErrors(),
    });
  }

  createClo(syllabusId: string, model: ICloRequest): Observable<IClo> {
    return this.http.post<IClo>(UrlConstant.API.SYLLABUS_CLOS(syllabusId), model, {
      context: this.inlineErrors(),
    });
  }

  updateClo(id: string, model: ICloUpdateRequest): Observable<IClo> {
    return this.http.put<IClo>(UrlConstant.API.CLO_DETAIL(id), model, {
      context: this.inlineErrors(),
    });
  }

  deleteClo(id: string): Observable<void> {
    return this.http.delete<void>(UrlConstant.API.CLO_DETAIL(id), {
      context: this.inlineErrors(),
    });
  }

  // ========== Liên kết CLO–PI & Ma trận (PROGRAM_MANAGER / QA_OFFICER) ==========

  getCloPiLinks(syllabusId: string): Observable<ICloPiLink[]> {
    return this.http.get<ICloPiLink[]>(UrlConstant.API.SYLLABUS_CLO_PI_LINKS(syllabusId));
  }

  getCloPiMatrix(syllabusId: string, programVersionId: string): Observable<ICloPiMatrix> {
    const params = new HttpParams().set('programVersionId', programVersionId);
    return this.http.get<ICloPiMatrix>(UrlConstant.API.SYLLABUS_CLO_PI_MATRIX(syllabusId), {
      params,
      context: this.inlineErrors(),
    });
  }

  createCloPiLink(syllabusId: string, model: ICloPiLinkRequest): Observable<ICloPiLink> {
    return this.http.post<ICloPiLink>(
      UrlConstant.API.SYLLABUS_CLO_PI_LINKS(syllabusId),
      model,
      { context: this.inlineErrors() },
    );
  }

  deleteCloPiLink(linkId: string): Observable<void> {
    return this.http.delete<void>(UrlConstant.API.CLO_PI_LINK_DETAIL(linkId), {
      context: this.inlineErrors(),
    });
  }

  verifyCloPiLink(linkId: string, model: IVerificationRequest): Observable<ICloPiLink> {
    return this.http.put<ICloPiLink>(UrlConstant.API.CLO_PI_LINK_VERIFY(linkId), model, {
      context: this.inlineErrors(),
    });
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
