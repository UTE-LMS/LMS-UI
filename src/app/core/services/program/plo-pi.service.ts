import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import {
  ICoursePiContribution,
  ICoursePiContributionRequest,
  IPi,
  IPiRequest,
  IPlo,
  IPloRequest,
  IProgramCourse,
} from '@models/program/plo-pi.model';
import { Observable } from 'rxjs';

/**
 * Quản lý Chuẩn đầu ra PLO, Chỉ số PI và Ma trận I/R/M (F02, US-06, US-07).
 * Quyền tạo/sửa/xóa: PROGRAM_MANAGER trong scope.
 * Quyền đọc: Mọi vai trò đã đăng nhập.
 */
@Injectable({
  providedIn: 'root',
})
export class PloPiService {
  private readonly http = inject(HttpClient);

  // ========== PLO ==========

  getPlos(programVersionId: string): Observable<IPlo[]> {
    return this.http.get<IPlo[]>(UrlConstant.API.PLOS(programVersionId));
  }

  getPlo(programVersionId: string, id: string): Observable<IPlo> {
    return this.http.get<IPlo>(UrlConstant.API.PLO_DETAIL(programVersionId, id), {
      context: this.inlineErrors(),
    });
  }

  createPlo(programVersionId: string, model: IPloRequest): Observable<IPlo> {
    return this.http.post<IPlo>(UrlConstant.API.PLOS(programVersionId), model, {
      context: this.inlineErrors(),
    });
  }

  updatePlo(programVersionId: string, id: string, model: IPloRequest): Observable<IPlo> {
    return this.http.put<IPlo>(UrlConstant.API.PLO_DETAIL(programVersionId, id), model, {
      context: this.inlineErrors(),
    });
  }

  deletePlo(programVersionId: string, id: string): Observable<void> {
    return this.http.delete<void>(UrlConstant.API.PLO_DETAIL(programVersionId, id), {
      context: this.inlineErrors(),
    });
  }

  // ========== PI ==========

  getPis(programVersionId: string): Observable<IPi[]> {
    return this.http.get<IPi[]>(UrlConstant.API.PIS(programVersionId));
  }

  getPi(programVersionId: string, id: string): Observable<IPi> {
    return this.http.get<IPi>(UrlConstant.API.PI_DETAIL(programVersionId, id), {
      context: this.inlineErrors(),
    });
  }

  createPi(programVersionId: string, model: IPiRequest): Observable<IPi> {
    return this.http.post<IPi>(UrlConstant.API.PIS(programVersionId), model, {
      context: this.inlineErrors(),
    });
  }

  updatePi(programVersionId: string, id: string, model: IPiRequest): Observable<IPi> {
    return this.http.put<IPi>(UrlConstant.API.PI_DETAIL(programVersionId, id), model, {
      context: this.inlineErrors(),
    });
  }

  deletePi(programVersionId: string, id: string): Observable<void> {
    return this.http.delete<void>(UrlConstant.API.PI_DETAIL(programVersionId, id), {
      context: this.inlineErrors(),
    });
  }

  // ========== Ma trận I/R/M (Course PI Contributions) ==========

  getContributions(programVersionId: string): Observable<ICoursePiContribution[]> {
    return this.http.get<ICoursePiContribution[]>(UrlConstant.API.PI_CONTRIBUTIONS(programVersionId));
  }

  createContribution(
    programVersionId: string,
    model: ICoursePiContributionRequest,
  ): Observable<ICoursePiContribution> {
    return this.http.post<ICoursePiContribution>(
      UrlConstant.API.PI_CONTRIBUTIONS(programVersionId),
      model,
      { context: this.inlineErrors() },
    );
  }

  deleteContribution(programVersionId: string, id: string): Observable<void> {
    return this.http.delete<void>(UrlConstant.API.PI_CONTRIBUTION_DETAIL(programVersionId, id), {
      context: this.inlineErrors(),
    });
  }

  // ========== Môn học thuộc CTĐT ==========

  getProgramCourses(programVersionId: string): Observable<IProgramCourse[]> {
    return this.http.get<IProgramCourse[]>(UrlConstant.API.PROGRAM_COURSES(programVersionId));
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
