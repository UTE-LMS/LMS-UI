import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IPi, IPlo } from '@models/program/plo-pi.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { IVerificationRequest } from '@models/program/program-verification.model';
import { Observable } from 'rxjs';

/**
 * Dịch vụ Thẩm định Đảm bảo chất lượng (QA) cho CTĐT (US-08, ADR 0014).
 * Quyền gọi: QA.
 */
@Injectable({
  providedIn: 'root',
})
export class ProgramVerificationService {
  private readonly http = inject(HttpClient);

  verifyVersion(versionId: string, model: IVerificationRequest): Observable<IProgramVersion> {
    return this.http.put<IProgramVersion>(UrlConstant.API.PROGRAM_VERSION_VERIFY(versionId), model, {
      context: this.inlineErrors(),
    });
  }

  verifyPlo(versionId: string, ploId: string, model: IVerificationRequest): Observable<IPlo> {
    return this.http.put<IPlo>(UrlConstant.API.PLO_VERIFY(versionId, ploId), model, {
      context: this.inlineErrors(),
    });
  }

  verifyPi(versionId: string, piId: string, model: IVerificationRequest): Observable<IPi> {
    return this.http.put<IPi>(UrlConstant.API.PI_VERIFY(versionId, piId), model, {
      context: this.inlineErrors(),
    });
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
