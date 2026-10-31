import { HttpErrorResponse } from '@angular/common/http';
import { IApiError } from '@models/common/response-data.model';

/**
 * Đọc body lỗi chuẩn của backend (API-CONTRACT.md §2). Trả về null khi lỗi không phải HTTP
 * (mất mạng, hết thời gian) hoặc body không đúng định dạng, để màn hình dùng thông báo chung.
 */
export function toApiError(err: unknown): IApiError | null {
  if (!(err instanceof HttpErrorResponse)) {
    return null;
  }
  const body: unknown = err.error;
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const candidate = body as Partial<IApiError>;
  if (typeof candidate.status !== 'number' || typeof candidate.message !== 'string') {
    return null;
  }
  return candidate as IApiError;
}

/** Mã trạng thái HTTP của lỗi, hoặc 0 khi không phải lỗi HTTP có phản hồi. */
export function httpStatusOf(err: unknown): number {
  return err instanceof HttpErrorResponse ? err.status : 0;
}
