/**
 * Mẫu số của kết quả tổng hợp cấp lớp/khóa/CTĐT (GiaiThich_CoSoDuLieu.md §4.26, F06 §US-29).
 * UI chỉ HIỂN THỊ các giá trị này; mọi phép chia do backend thực hiện.
 */
export interface IAggregateCounts {
  /** Số ghi danh. */
  enrolled: number;
  /** Số có đủ dữ liệu để đánh giá. */
  evaluable: number;
  passed: number;
  failed: number;
  /** Số chưa đủ dữ liệu (kể cả người không có bản ghi điểm nào). */
  insufficientData: number;
}

export interface IAggregateDenominator {
  /** Có thể thiếu từng khoản khi API chưa trả đủ; UI hiển thị "Chưa có" cho khoản thiếu, không phải 0. */
  counts: Partial<IAggregateCounts> | null;
  /** Đạt / đủ dữ liệu, tỷ lệ 0–1; null khi mẫu số là 0. */
  passRate: number | null;
  /** Đạt / ghi danh, tỷ lệ 0–1; luôn đi kèm `passRate` để tỷ lệ cao không che phần thiếu. */
  passRateOfEnrolled: number | null;
  /** Đủ dữ liệu / ghi danh, tỷ lệ 0–1. */
  dataCompleteness: number | null;
}
