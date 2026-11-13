import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IClo, ICloPiLink, ICloPiMatrix } from '@models/course/clo.model';
import { Observable } from 'rxjs';

/**
 * Đọc Chuẩn đầu ra Học phần (CLO) và Ma trận Liên kết CLO–PI (chỉ đọc).
 */
@Injectable({
  providedIn: 'root',
})
export class CloService {
  private readonly http = inject(HttpClient);

  getClosBySyllabus(syllabusId: string): Observable<IClo[]> {
    return this.http.get<IClo[]>(UrlConstant.API.SYLLABUS_CLOS(syllabusId));
  }

  getCloById(id: string): Observable<IClo> {
    return this.http.get<IClo>(UrlConstant.API.CLO_DETAIL(id), {
      context: this.inlineErrors(),
    });
  }

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

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
