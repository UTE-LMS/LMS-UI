import { HttpContextToken } from '@angular/common/http';
import { HTTP_POLICY } from '@constants/error-message.constant';

/**
 * Đặt `true` cho request mà màn hình tự hiển thị lỗi 4xx (trừ 403): đăng nhập, tạo/sửa/khóa người dùng.
 * Khi đó HandlerErrorService không bật toast và không đá về trang đăng nhập cho 400/401/404/409/422,
 * để form giữ nguyên dữ liệu đã nhập và gắn lỗi vào đúng ô (API-CONTRACT.md §3).
 */
export const INLINE_ERRORS = new HttpContextToken<boolean>(() => false);

/**
 * Thời gian chờ tối đa (ms) giữa hai sự kiện của một yêu cầu. Mặc định HTTP_POLICY.DEFAULT_TIMEOUT_MS.
 * Đặt 0 để tắt, dùng cho tải lên/xuất tệp lớn mà màn hình tự theo dõi tiến trình.
 */
export const REQUEST_TIMEOUT_MS = new HttpContextToken<number>(() => HTTP_POLICY.DEFAULT_TIMEOUT_MS);

/** Đặt `false` để tắt tự thử lại cho một yêu cầu GET cụ thể. POST/PUT/PATCH/DELETE không bao giờ được tự thử lại. */
export const AUTO_RETRY = new HttpContextToken<boolean>(() => true);
