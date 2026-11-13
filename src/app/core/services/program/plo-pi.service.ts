import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IPi, IPlo, IProgramCourse } from '@models/program/plo-pi.model';
import { Observable } from 'rxjs';

/**
 * Đọc Chuẩn đầu ra PLO, Chỉ số PI và Môn học thuộc CTĐT (F02, chỉ đọc).
 * Dữ liệu được tạo/cập nhật thông qua Import CSV phiên bản CTĐT.
 */
@Injectable({
  providedIn: 'root',
})
export class PloPiService {
  private readonly http = inject(HttpClient);

  getPlos(programVersionId: string): Observable<IPlo[]> {
    return this.http.get<IPlo[]>(UrlConstant.API.PLOS(programVersionId));
  }

  getPlo(programVersionId: string, id: string): Observable<IPlo> {
    return this.http.get<IPlo>(UrlConstant.API.PLO_DETAIL(programVersionId, id), {
      context: this.inlineErrors(),
    });
  }

  getPis(programVersionId: string): Observable<IPi[]> {
    return this.http.get<IPi[]>(UrlConstant.API.PIS(programVersionId));
  }

  getPi(programVersionId: string, id: string): Observable<IPi> {
    return this.http.get<IPi>(UrlConstant.API.PI_DETAIL(programVersionId, id), {
      context: this.inlineErrors(),
    });
  }

  getProgramCourses(programVersionId: string): Observable<IProgramCourse[]> {
    return this.http.get<IProgramCourse[]>(UrlConstant.API.PROGRAM_COURSES(programVersionId));
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
