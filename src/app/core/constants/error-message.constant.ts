import { UserErrorKind } from '@models/common/user-error.model';

/** Tên header truy vết (API-CONTRACT.md §1.4). */
export const CORRELATION_ID_HEADER = 'X-Correlation-Id';

/** Văn bản lỗi tiếng Việt, đặt một chỗ để dễ sửa. `message` là nội dung mặc định khi backend không trả thông điệp an toàn. */
export const ERROR_MESSAGE: Record<UserErrorKind, { title: string; message: string; }> = {
  VALIDATION: {
    title: 'Dữ liệu chưa hợp lệ',
    message: 'Dữ liệu yêu cầu không hợp lệ. Vui lòng kiểm tra lại các thông tin đã nhập.',
  },
  UNAUTHORIZED: {
    title: 'Phiên làm việc đã hết hạn',
    message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  },
  FORBIDDEN: {
    title: 'Không đủ quyền',
    message: 'Bạn không có quyền truy cập chức năng này.',
  },
  NOT_FOUND: {
    title: 'Không tìm thấy dữ liệu',
    message: 'Không tìm thấy dữ liệu yêu cầu.',
  },
  CONFLICT: {
    title: 'Dữ liệu bị xung đột',
    message: 'Dữ liệu vừa được người khác thay đổi hoặc đã tồn tại.',
  },
  BUSINESS_RULE: {
    title: 'Không thực hiện được',
    message: 'Thao tác vi phạm quy tắc nghiệp vụ của hệ thống.',
  },
  SERVER: {
    title: 'Lỗi hệ thống',
    message: 'Đã xảy ra lỗi nội bộ hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
  },
  NETWORK: {
    title: 'Không kết nối được máy chủ',
    message: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.',
  },
  TIMEOUT: {
    title: 'Máy chủ phản hồi quá lâu',
    message: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.',
  },
  CLIENT: {
    title: 'Yêu cầu không thực hiện được',
    message: 'Yêu cầu không thực hiện được. Vui lòng thử lại hoặc liên hệ quản trị viên.',
  },
  UNKNOWN: {
    title: 'Có lỗi xảy ra',
    message: 'Có lỗi xảy ra, vui lòng thử lại!',
  },
};

/** Gợi ý khi xung đột dữ liệu (409): không ghi đè im lặng, người dùng tải lại rồi thao tác lại. */
export const CONFLICT_RELOAD_HINT
  = 'Dữ liệu có thể vừa được người khác thay đổi. Hãy tải lại để xem bản mới nhất rồi thực hiện lại; hệ thống không tự ghi đè.';

/** Hết thời gian khi ghi: yêu cầu có thể đã tới máy chủ, nên không khuyên bấm lại ngay. */
export const MUTATION_UNCERTAIN_HINT
  = 'Thao tác có thể đã được thực hiện. Hãy kiểm tra lại dữ liệu trước khi thực hiện lại.';

export const CORRELATION_ID_LABEL = 'Mã truy vết';

/** Chính sách HTTP dùng chung cho interceptor hết thời gian và thử lại. */
export const HTTP_POLICY = {
  /** Thời gian chờ tối đa giữa hai sự kiện của một yêu cầu. */
  DEFAULT_TIMEOUT_MS: 30_000,
  /** Chỉ thao tác chỉ đọc mới được tự thử lại (idempotent, không đổi dữ liệu). */
  SAFE_METHODS: ['GET', 'HEAD'],
  MAX_AUTO_RETRIES: 2,
  RETRY_BASE_DELAY_MS: 500,
  /** Lỗi tạm thời đáng thử lại: 0 (không có phản hồi), 502, 503, 504. Không thử lại 500 vì thường lặp lại. */
  TRANSIENT_STATUS: [0, 502, 503, 504],
} as const;
