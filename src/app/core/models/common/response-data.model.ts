/**
 * Chuẩn phản hồi lỗi thống nhất của backend (API-CONTRACT.md §2).
 */
export interface IApiFieldError {
  field: string;
  message: string;
  rejectedValue?: unknown;
}

export interface IApiError {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  fieldErrors?: IApiFieldError[];
}

/**
 * Phong bì phân trang chuẩn, zero-indexed (API-CONTRACT.md §5.1.3).
 */
export interface IPagedResults<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
