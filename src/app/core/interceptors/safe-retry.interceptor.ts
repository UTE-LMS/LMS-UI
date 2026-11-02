import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { HTTP_POLICY } from '@constants/error-message.constant';
import { Observable, throwError, timer } from 'rxjs';
import { retry } from 'rxjs/operators';
import { AUTO_RETRY } from './http-context.token';
import { RequestTimeoutError } from './request-timeout.error';

const isTransient = (error: unknown): boolean => error instanceof HttpErrorResponse
  // Hết thời gian không tự thử lại: tránh chờ 3 lần liên tiếp, để người dùng chủ động bấm "Thử lại".
  && !(error.error instanceof RequestTimeoutError)
  && (HTTP_POLICY.TRANSIENT_STATUS as readonly number[]).includes(error.status);

const isOffline = (): boolean => typeof navigator !== 'undefined' && !navigator.onLine;

/** Thời gian chờ trước lần thử thứ `retryCount`: 0,5 s, 1 s, 2 s... */
const backoffDelay = (retryCount: number): number => HTTP_POLICY.RETRY_BASE_DELAY_MS * (2 ** (retryCount - 1));

function retryDelay(error: unknown, retryCount: number): Observable<number> {
  if (!isTransient(error) || isOffline()) {
    return throwError(() => error);
  }
  return timer(backoffDelay(retryCount));
}

/**
 * Tự thử lại có kiểm soát: CHỈ GET/HEAD (an toàn, idempotent), tối đa MAX_AUTO_RETRIES lần, lùi dần
 * 0,5 s → 1 s, chỉ với lỗi tạm thời (mất kết nối, 502/503/504), và không thử khi trình duyệt đang ngoại tuyến.
 * POST/PUT/PATCH/DELETE không bao giờ được thử lại ở đây vì có thể ghi hai lần.
 */
export const safeRetryInterceptor: HttpInterceptorFn = (request, next) => {
  const isSafeMethod = (HTTP_POLICY.SAFE_METHODS as readonly string[]).includes(request.method);
  if (!isSafeMethod || !request.context.get(AUTO_RETRY)) {
    return next(request);
  }
  return next(request).pipe(retry({ count: HTTP_POLICY.MAX_AUTO_RETRIES, delay: retryDelay }));
};
