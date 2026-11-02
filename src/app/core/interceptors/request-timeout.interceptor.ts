import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, throwError, timeout, TimeoutError } from 'rxjs';
import { REQUEST_TIMEOUT_MS } from './http-context.token';
import { RequestTimeoutError } from './request-timeout.error';

function toTimeoutResponse(request: HttpRequest<unknown>, timeoutMs: number): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 0,
    statusText: 'Timeout',
    url: request.urlWithParams,
    error: new RequestTimeoutError(request.method, timeoutMs),
  });
}

/**
 * Hết thời gian chờ: hủy yêu cầu và đổi thành HttpErrorResponse (status 0) có nguyên nhân RequestTimeoutError,
 * để mọi chỗ xử lý lỗi thấy một kiểu duy nhất. Đặt SAU interceptor thử lại để mỗi lần thử có hạn riêng.
 */
export const requestTimeoutInterceptor: HttpInterceptorFn = (request, next) => {
  const timeoutMs = request.context.get(REQUEST_TIMEOUT_MS);
  if (timeoutMs <= 0) {
    return next(request);
  }
  return next(request).pipe(
    timeout({ each: timeoutMs }),
    catchError((err: unknown) => {
      if (err instanceof TimeoutError) {
        return throwError(() => toTimeoutResponse(request, timeoutMs));
      }
      return throwError(() => err);
    }),
  );
};
