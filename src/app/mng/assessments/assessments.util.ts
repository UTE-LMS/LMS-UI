import { IAssessment, IAssessmentItem } from '@models/assessment/assessment.model';

/**
 * Hàm thuần của màn hình bài đánh giá (F04). CHỈ để gợi ý và hiển thị phía client: backend mới là nơi kiểm tra
 * và quyết định (AssessmentItemValidator, AssessmentApprovalService). Hai sai số dưới đây sao chép đúng hằng của
 * backend để gợi ý không lệch; nếu backend đổi, backend vẫn thắng.
 */

/** Sai số của Σ phần điểm một câu so với 1 (backend: WEIGHT_TOLERANCE). */
export const WEIGHT_SUM_TOLERANCE = 0.0001;
/** Sai số giữa tổng điểm khai báo và Σ điểm tối đa khi gửi duyệt (backend: TOTAL_POINTS_TOLERANCE). */
export const TOTAL_POINTS_TOLERANCE = 0.001;

export const NOT_AVAILABLE = '—';

/** Số theo định dạng Việt Nam (dấu phẩy thập phân); thiếu dữ liệu hiện "—", không bao giờ là 0. */
export function formatNumber(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return NOT_AVAILABLE;
  }
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 4 });
}

export function sumWeights(mappings: readonly { weight: number | null; }[]): number {
  return mappings.reduce((total, m) => total + (m.weight ?? 0), 0);
}

export function weightSumMatches(sum: number): boolean {
  return Math.abs(sum - 1) <= WEIGHT_SUM_TOLERANCE;
}

export function sumMaxScores(items: readonly { maxScore: number; }[]): number {
  return items.reduce((total, item) => total + item.maxScore, 0);
}

/** null khi chưa khai báo tổng điểm (không đối chiếu được). */
export function totalPointsMatches(totalPoints: number | null | undefined, itemsSum: number): boolean | null {
  if (typeof totalPoints !== 'number') {
    return null;
  }
  return Math.abs(totalPoints - itemsSum) < TOTAL_POINTS_TOLERANCE;
}

export function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

/** Chuỗi tùy chọn: bỏ khoảng trắng; rỗng thành undefined để không gửi lên backend. */
export function cleanOptional(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed;
}

/**
 * Cấu trúc còn sửa được hay không, để ẩn/khóa nút. Khung theo đề cương luôn sửa được; bản lớp chỉ sửa được ở Nháp
 * hoặc Bị từ chối và khi chưa khóa (`locked`). Backend kiểm tra lại (422) nên đây chỉ là gợi ý.
 */
export function isStructureEditable(assessment: Pick<IAssessment, 'scope' | 'status' | 'locked'>): boolean {
  if (assessment.scope === 'SYLLABUS_TEMPLATE') {
    return true;
  }
  return !assessment.locked && (assessment.status === 'DRAFT' || assessment.status === 'REJECTED');
}

/** Giải thích vì sao cấu trúc không sửa được (hiện ở banner khóa); null khi sửa được. */
export function lockReason(assessment: Pick<IAssessment, 'scope' | 'status' | 'locked'>): string | null {
  if (isStructureEditable(assessment)) {
    return null;
  }
  if (assessment.status === 'SUBMITTED') {
    return 'Bài đã gửi duyệt và đang chờ Trưởng bộ môn: cấu trúc tạm khóa sửa. Nếu bị từ chối, bài quay về để sửa.';
  }
  return 'Ma trận đã được duyệt: cấu trúc câu hỏi, điểm tối đa và CLO bị khóa để điểm sau này gắn đúng vào ma trận đã duyệt.';
}

export interface ISubmitHint {
  /** Chặn hẳn việc bấm Gửi duyệt ở client (lỗi chắc chắn); backend vẫn kiểm tra lại. */
  blocking: boolean;
  message: string;
}

/**
 * Gợi ý trước khi gửi duyệt, mô phỏng các điều kiện NEW-01/AC-2: có ít nhất một phần tử, đã khai báo tổng điểm,
 * tổng điểm khớp Σ điểm tối đa. Chưa lưu thay đổi thì buộc lưu trước vì backend duyệt bản đã lưu.
 */
export function submitHints(
  assessment: Pick<IAssessment, 'totalPoints'>,
  items: readonly IAssessmentItem[],
  hasUnsavedChanges: boolean,
): ISubmitHint[] {
  const hints: ISubmitHint[] = [];
  if (hasUnsavedChanges) {
    hints.push({ blocking: true, message: 'Có thay đổi chưa lưu: lưu cấu trúc trước khi gửi duyệt.' });
  }
  if (items.length === 0) {
    hints.push({ blocking: true, message: 'Chưa có câu hỏi/tiêu chí nào: thêm ít nhất một phần tử.' });
  }
  const itemsSum = sumMaxScores(items);
  const match = totalPointsMatches(assessment.totalPoints, itemsSum);
  if (match === null) {
    hints.push({ blocking: true, message: 'Chưa khai báo tổng điểm của bài.' });
  } else if (!match) {
    hints.push({
      blocking: true,
      message: `Tổng điểm khai báo (${formatNumber(assessment.totalPoints)}) lệch tổng điểm tối đa các phần tử (${formatNumber(itemsSum)}).`,
    });
  }
  return hints;
}

/** Gán lại thứ tự 1..n theo vị trí trong danh sách trước khi lưu. */
export function renumber(items: readonly IAssessmentItem[]): IAssessmentItem[] {
  return items.map((item, index) => ({ ...item, orderIndex: index + 1 }));
}

/** Chiều rộng thanh tỷ lệ (chỉ hiển thị): phần trăm API trả về, kẹp trong 0–100. */
export function meterWidth(percentage: number | null | undefined): string {
  const value = typeof percentage === 'number' && Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
  return `${value}%`;
}

/** Nhãn các CLO của một phần tử: "CLO1 (0,5)". CLO không tra được mã thì hiện "CLO ?", không đoán. */
export function describeMappings(item: Pick<IAssessmentItem, 'outcomeMappings'>, cloCodes: ReadonlyMap<string, string>): string[] {
  return item.outcomeMappings.map(m => `${cloCodes.get(m.cloId) ?? 'CLO ?'} (${formatNumber(m.weight)})`);
}

/** Mã mặc định cho phần tử mới: "C" + số nhỏ nhất chưa dùng. */
export function nextItemCode(existingCodes: readonly string[]): string {
  const used = new Set(existingCodes.map(code => code.toLowerCase()));
  let n = existingCodes.length + 1;
  while (used.has(`c${n}`)) {
    n += 1;
  }
  return `C${n}`;
}
