import { HttpErrorResponse } from '@angular/common/http';
import {
  CONFLICT_RELOAD_HINT, CORRELATION_ID_HEADER, ERROR_MESSAGE, HTTP_POLICY, MUTATION_UNCERTAIN_HINT,
} from '@constants/error-message.constant';
import { RequestTimeoutError } from '@interceptors/request-timeout.error';
import { IApiError, IApiFieldError } from '@models/common/response-data.model';
import { IUserError, UserErrorKind } from '@models/common/user-error.model';

const MAX_SAFE_MESSAGE_LENGTH = 500;
const MAX_CORRELATION_ID_LENGTH = 64;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

/** Dấu hiệu của stack trace hoặc chi tiết nội bộ của Java/Spring/MongoDB lọt vào thông điệp. */
const INTERNAL_DETAIL_PATTERN
  = /\bat\s+[\w$.]+\(|\.java:\d+|\bjava\.|\bjavax\.|\borg\.springframework|\bcom\.mongodb|Exception|Caused by|stack\s?trace|<\/?[a-z][^>]*>/i;

/**
 * Thông điệp chỉ được hiển thị khi là chuỗi ngắn, không rỗng và không chứa dấu hiệu chi tiết nội bộ.
 * Backend cam kết `message` an toàn (API-CONTRACT.md §2.2) nhưng UI không tin tuyệt đối vì lỗi có thể
 * đến từ cổng/proxy hoặc bản backend sai.
 */
export function isSafeMessage(message: unknown): message is string {
  return typeof message === 'string'
    && message.trim().length > 0
    && message.length <= MAX_SAFE_MESSAGE_LENGTH
    && !INTERNAL_DETAIL_PATTERN.test(message);
}

function toFieldErrors(value: unknown): IApiFieldError[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const result: IApiFieldError[] = [];
  for (const item of value as unknown[]) {
    if (typeof item === 'object' && item !== null) {
      const candidate = item as Partial<Record<keyof IApiFieldError, unknown>>;
      if (typeof candidate.field === 'string' && typeof candidate.message === 'string') {
        result.push({ field: candidate.field, message: candidate.message, rejectedValue: candidate.rejectedValue });
      }
    }
  }
  return result;
}

/**
 * Đọc body lỗi chuẩn của backend (API-CONTRACT.md §2). Trả về null khi lỗi không phải HTTP
 * (mất mạng, hết thời gian) hoặc body không đúng định dạng (chuỗi, HTML, Blob, mảng, thiếu `status`/`message`),
 * để màn hình dùng thông báo chung. Các trường phụ thiếu hoặc sai kiểu được chuẩn hóa về chuỗi rỗng/mảng rỗng.
 */
export function toApiError(err: unknown): IApiError | null {
  if (!(err instanceof HttpErrorResponse)) {
    return null;
  }
  const body: unknown = err.error;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }
  const candidate = body as Partial<Record<keyof IApiError, unknown>>;
  if (typeof candidate.status !== 'number' || typeof candidate.message !== 'string') {
    return null;
  }
  return {
    timestamp: typeof candidate.timestamp === 'string' ? candidate.timestamp : '',
    status: candidate.status,
    code: typeof candidate.code === 'string' ? candidate.code : '',
    message: candidate.message,
    path: typeof candidate.path === 'string' ? candidate.path : '',
    fieldErrors: toFieldErrors(candidate.fieldErrors),
  };
}

/** Mã trạng thái HTTP của lỗi, hoặc 0 khi không phải lỗi HTTP có phản hồi. */
export function httpStatusOf(err: unknown): number {
  return err instanceof HttpErrorResponse ? err.status : 0;
}

/** Mã truy vết trong header phản hồi; bỏ qua giá trị rỗng, quá dài hoặc có ký tự lạ. */
export function correlationIdOf(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse)) {
    return null;
  }
  const value = err.headers?.get(CORRELATION_ID_HEADER)?.trim();
  return value && value.length <= MAX_CORRELATION_ID_LENGTH && CORRELATION_ID_PATTERN.test(value) ? value : null;
}

function kindOf(status: number, isTimeout: boolean): UserErrorKind {
  if (isTimeout || status === 408) {
    return 'TIMEOUT';
  }
  switch (status) {
    case 0: return 'NETWORK';
    case 400: return 'VALIDATION';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'BUSINESS_RULE';
    default:
      if (status >= 500 && status <= 599) {
        return 'SERVER';
      }
      return status >= 400 && status < 500 ? 'CLIENT' : 'UNKNOWN';
  }
}

/** Các nhóm lỗi mà thông điệp của backend là nội dung chính (người dùng cần đọc để sửa). */
const SERVER_MESSAGE_KINDS: readonly UserErrorKind[] = ['VALIDATION', 'CONFLICT', 'BUSINESS_RULE', 'CLIENT'];
const RETRYABLE_KINDS: readonly UserErrorKind[] = ['NETWORK', 'TIMEOUT', 'SERVER'];

/**
 * Chuyển mọi lỗi (HttpErrorResponse chuẩn hoặc không chuẩn, lỗi mạng, hết thời gian, lỗi JavaScript) thành
 * thông tin an toàn để hiển thị, theo bảng ánh xạ API-CONTRACT.md §3. Không bao giờ đưa `error.message` của
 * JavaScript, tên máy chủ, đường dẫn nội bộ hay stack trace vào kết quả.
 */
export function toUserError(err: unknown): IUserError {
  const httpError = err instanceof HttpErrorResponse ? err : null;
  const timeoutCause = httpError?.error instanceof RequestTimeoutError ? httpError.error : null;
  const status = httpError?.status ?? 0;
  const kind: UserErrorKind = httpError ? kindOf(status, timeoutCause !== null) : 'UNKNOWN';
  const api = toApiError(err);

  const serverMessage = isSafeMessage(api?.message) ? api.message.trim() : null;
  const fieldErrors = (api?.fieldErrors ?? []).filter(item => isSafeMessage(item.message));
  const fallback = ERROR_MESSAGE[kind];

  let hint: string | null = null;
  if (kind === 'CONFLICT') {
    hint = CONFLICT_RELOAD_HINT;
  } else if (timeoutCause && !(HTTP_POLICY.SAFE_METHODS as readonly string[]).includes(timeoutCause.method)) {
    hint = MUTATION_UNCERTAIN_HINT;
  }

  return {
    kind,
    status,
    code: api?.code === '' ? null : (api?.code ?? null),
    title: fallback.title,
    message: SERVER_MESSAGE_KINDS.includes(kind) && serverMessage ? serverMessage : fallback.message,
    serverMessage,
    hint,
    fieldErrors,
    correlationId: correlationIdOf(err),
    retryable: RETRYABLE_KINDS.includes(kind),
    suggestReload: kind === 'CONFLICT',
  };
}
