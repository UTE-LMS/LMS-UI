import { HttpContextToken } from '@angular/common/http';

/**
 * Đặt `true` cho request mà màn hình tự hiển thị lỗi 4xx (trừ 403): đăng nhập, tạo/sửa/khóa người dùng.
 * Khi đó HandlerErrorService không bật toast và không đá về trang đăng nhập cho 400/401/404/409/422,
 * để form giữ nguyên dữ liệu đã nhập và gắn lỗi vào đúng ô (API-CONTRACT.md §3).
 */
export const INLINE_ERRORS = new HttpContextToken<boolean>(() => false);
