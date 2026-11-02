/** Sắc thái hiển thị. Chỉ là một trong ba tín hiệu (cùng biểu tượng và chữ), không bao giờ là tín hiệu duy nhất. */
export type StatusTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'accent';

/** Kiểu viền: giúp phân biệt trạng thái ngay cả khi không thấy màu. */
export type StatusLineStyle = 'solid' | 'dashed' | 'dotted';

export interface IStatusDisplay {
  label: string;
  /** Chú thích giải thích ý nghĩa (tooltip và văn bản cho trình đọc màn hình). */
  description: string;
  /** Lớp Font Awesome (ví dụ `fa-circle-check`). */
  icon: string;
  tone: StatusTone;
  lineStyle: StatusLineStyle;
}
