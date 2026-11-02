import { IApiFieldError } from './response-data.model';

/**
 * Nhóm lỗi dành cho giao diện. Suy ra từ mã HTTP (API-CONTRACT.md §3), không phải từ `code` của backend,
 * để lỗi không có body chuẩn (cổng, proxy, mất mạng) vẫn có cách hiển thị rõ ràng.
 */
export type UserErrorKind =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE'
  | 'SERVER'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'CLIENT'
  | 'UNKNOWN';

/** Lỗi đã được làm sạch để hiển thị cho người dùng: không chứa stack trace hay chi tiết nội bộ. */
export interface IUserError {
  kind: UserErrorKind;
  /** Mã HTTP; 0 khi không có phản hồi (mất mạng, hết thời gian) hoặc lỗi không phải HTTP. */
  status: number;
  /** `code` do backend trả (ví dụ `CONFLICT`), null nếu body không đúng chuẩn. */
  code: string | null;
  title: string;
  /** Thông báo chính đã an toàn để hiển thị. */
  message: string;
  /** `message` của backend khi đã qua kiểm tra an toàn; form dùng nó (ví dụ 401 của đăng nhập). */
  serverMessage: string | null;
  /** Gợi ý bổ sung (tải lại khi xung đột, kiểm tra lại dữ liệu khi hết thời gian lúc ghi). */
  hint: string | null;
  fieldErrors: IApiFieldError[];
  /** Giá trị header `X-Correlation-Id` của phản hồi, để người dùng báo lỗi. */
  correlationId: string | null;
  /** Lỗi tạm thời (mạng, hết thời gian, máy chủ): màn hình đọc dữ liệu có thể đưa nút "Thử lại". */
  retryable: boolean;
  /** Nên đưa nút "Tải lại dữ liệu" (xung đột 409). */
  suggestReload: boolean;
}
