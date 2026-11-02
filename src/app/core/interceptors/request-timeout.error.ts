/**
 * Nguyên nhân của HttpErrorResponse do interceptor hết thời gian tạo ra. Mang theo phương thức HTTP để
 * thông báo phân biệt đọc (cứ thử lại) với ghi (có thể đã được máy chủ xử lý).
 */
export class RequestTimeoutError extends Error {
  constructor(readonly method: string, readonly timeoutMs: number) {
    super(`Request timed out after ${timeoutMs} ms`);
    this.name = 'RequestTimeoutError';
  }
}
