import {
  AssessmentStatus, IAssessment, IAssessmentCloWeight, IAssessmentItem,
} from '@models/assessment/assessment.model';

/**
 * Hàm thuần của màn hình bài đánh giá (ADR 0014, Schema v0.7).
 * Chỉ để gợi ý và hiển thị phía client: backend mới là nơi kiểm tra và quyết định.
 */

export const NOT_AVAILABLE = '—';

/** Số theo định dạng Việt Nam (dấu phẩy thập phân); thiếu dữ liệu hiện "—". */
export function formatNumber(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return NOT_AVAILABLE;
  }
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 4 });
}

export function sumOutcomeScores(mappings: readonly { maxScore: number | null; }[]): number {
  return mappings.reduce((total, m) => total + (m.maxScore ?? 0), 0);
}

export function sumCloWeights(cloWeights: readonly { weight: number | null; }[]): number {
  return cloWeights.reduce((total, c) => total + (c.weight ?? 0), 0);
}

export function sumItemMaxScores(items: readonly IAssessmentItem[]): number {
  return items.reduce((total, item) => total + sumOutcomeScores(item.outcomeMappings), 0);
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
 * Cấu trúc còn sửa được hay không. Khung đề cương luôn sửa được khi chưa khóa;
 * bản lớp chỉ sửa được khi ở trạng thái Nháp (DRAFT) và chưa khóa (locked = false).
 */
export function isStructureEditable(assessment: Pick<IAssessment, 'scope' | 'status' | 'locked'>): boolean {
  return !assessment.locked && assessment.status === 'DRAFT';
}

/** Giải thích vì sao cấu trúc không sửa được; null khi sửa được. */
export function lockReason(assessment: Pick<IAssessment, 'scope' | 'status' | 'locked'>): string | null {
  if (isStructureEditable(assessment)) {
    return null;
  }
  if (assessment.status === 'SCORE_ENTERED') {
    return 'Bài đánh giá đã được nhập điểm. Cấu trúc câu hỏi và phân bổ CLO bị khóa cố định.';
  }
  return 'Ma trận câu hỏi đã được khóa. Mở khóa lại nếu cần chỉnh sửa cấu trúc trước khi nhập điểm.';
}

export interface ILockHint {
  blocking: boolean;
  message: string;
}

/**
 * Gợi ý kiểm tra trước khi bấm Khóa ma trận (ADR 0014):
 * - Phải có ít nhất 1 câu hỏi
 * - Tất cả câu hỏi phải gán ít nhất 1 CLO và có điểm tối đa > 0
 * - Danh sách cloWeights phải khớp với các CLO xuất hiện trong câu hỏi
 */
export function lockHints(
  assessment: Pick<IAssessment, 'cloWeights'>,
  items: readonly IAssessmentItem[],
  hasUnsavedChanges: boolean,
): ILockHint[] {
  const hints: ILockHint[] = [];
  if (hasUnsavedChanges) {
    hints.push({ blocking: true, message: 'Có thay đổi chưa lưu: vui lòng lưu cấu trúc trước khi khóa.' });
  }
  if (items.length === 0) {
    hints.push({ blocking: true, message: 'Chưa có câu hỏi nào: thêm ít nhất một câu hỏi trước khi khóa.' });
  }
  const itemCloIds = new Set<string>();
  for (const item of items) {
    if (!item.outcomeMappings || item.outcomeMappings.length === 0) {
      hints.push({ blocking: true, message: `Câu hỏi ${item.code} chưa gán CLO nào.` });
    }
    for (const m of item.outcomeMappings) {
      itemCloIds.add(m.cloId);
      if (!m.maxScore || m.maxScore <= 0) {
        hints.push({ blocking: true, message: `Điểm tối đa của CLO trong câu hỏi ${item.code} phải lớn hơn 0.` });
      }
    }
  }

  const declaredCloIds = new Set(assessment.cloWeights?.map(c => c.cloId) ?? []);
  for (const cid of itemCloIds) {
    if (!declaredCloIds.has(cid)) {
      hints.push({ blocking: true, message: 'Tất cả CLO trong câu hỏi phải được khai báo trọng số trong bảng CLO Weights.' });
      break;
    }
  }
  for (const cid of declaredCloIds) {
    if (!itemCloIds.has(cid)) {
      hints.push({ blocking: true, message: 'Bảng CLO Weights chứa CLO không xuất hiện trong bất kỳ câu hỏi nào.' });
      break;
    }
  }

  return hints;
}

/** Gán lại thứ tự 1..n theo vị trí trong danh sách trước khi lưu. */
export function renumber(items: readonly IAssessmentItem[]): IAssessmentItem[] {
  return items.map((item, index) => ({ ...item, orderIndex: index + 1 }));
}

/** Chiều rộng thanh tỷ lệ: phần trăm API trả về, kẹp trong 0–100. */
export function meterWidth(percentage: number | null | undefined): string {
  const value = typeof percentage === 'number' && Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
  return `${value}%`;
}

/** Nhãn các CLO của một phần tử: "CLO1 (2.5 đ)". */
export function describeMappings(item: Pick<IAssessmentItem, 'outcomeMappings'>, cloCodes: ReadonlyMap<string, string>): string[] {
  return item.outcomeMappings.map(m => `${cloCodes.get(m.cloId) ?? 'CLO ?'} (${formatNumber(m.maxScore)} đ)`);
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

export const CLO_WEIGHT_EPSILON = 1e-6;

export type SectionCloWeightStatus = 'UNDER' | 'EXACT' | 'OVER';

export interface IOtherAssessmentCloWeight {
  assessmentId: string;
  assessmentCode: string;
  assessmentName: string;
  status: AssessmentStatus;
  weight: number;
}

export interface ISectionCloWeightSummary {
  cloId: string;
  otherWeight: number;
  currentWeight: number;
  totalWeight: number;
  remainingWeight: number;
  excessWeight: number;
  status: SectionCloWeightStatus;
  otherAssessments: IOtherAssessmentCloWeight[];
}

/** Làm tròn trọng số 4 chữ số thập phân để tránh sai số dấu phẩy động khi cộng các phần trăm. */
export function roundWeight(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Định dạng trọng số (0..1+) thành chuỗi phần trăm kiểu Việt Nam; thiếu dữ liệu trả về "—". */
export function formatWeightPercent(weight: number | null | undefined): string {
  if (typeof weight !== 'number' || !Number.isFinite(weight)) {
    return NOT_AVAILABLE;
  }
  return `${formatNumber(Math.round(weight * 10000) / 100)}%`;
}

/** Tính bề rộng 2 đoạn thanh chồng (bài khác + bài hiện tại), kẹp trong 0–100%. */
export function stackedBarWidths(
  otherWeight: number,
  currentWeight: number,
): { otherPct: number; currentPct: number; } {
  const safeOther = typeof otherWeight === 'number' && Number.isFinite(otherWeight) && otherWeight > 0 ? otherWeight : 0;
  const safeCurrent = typeof currentWeight === 'number' && Number.isFinite(currentWeight) && currentWeight > 0 ? currentWeight : 0;
  const otherPct = Math.min(100, roundWeight(safeOther * 100));
  const currentPct = Math.min(Math.max(0, roundWeight(100 - otherPct)), roundWeight(safeCurrent * 100));
  return { otherPct, currentPct };
}

/**
 * Tổng hợp trọng số đóng góp của từng CLO trên toàn bộ các bài đánh giá của lớp.
 * Chỉ để gợi ý ước lượng phía client tránh vượt 100%; backend là nơi kiểm tra chính thức.
 */
export function buildSectionCloWeightMap(
  sectionAssessments: readonly IAssessment[],
  currentAssessmentId: string,
  currentCloWeights: readonly IAssessmentCloWeight[],
  allCloIds: readonly string[] = [],
): ReadonlyMap<string, ISectionCloWeightSummary> {
  const cloIds = new Set<string>(allCloIds);
  for (const w of currentCloWeights) {
    if (w.cloId) cloIds.add(w.cloId);
  }
  for (const a of sectionAssessments) {
    for (const w of a.cloWeights ?? []) {
      if (w.cloId) cloIds.add(w.cloId);
    }
  }

  const otherSums = new Map<string, number>();
  const otherAssessmentsByClo = new Map<string, IOtherAssessmentCloWeight[]>();

  for (const a of sectionAssessments) {
    if (a.id === currentAssessmentId) {
      continue;
    }
    for (const w of a.cloWeights ?? []) {
      if (!w.cloId || typeof w.weight !== 'number' || !Number.isFinite(w.weight) || w.weight <= 0) {
        continue;
      }
      otherSums.set(w.cloId, (otherSums.get(w.cloId) ?? 0) + w.weight);
      const list = otherAssessmentsByClo.get(w.cloId) ?? [];
      list.push({
        assessmentId: a.id,
        assessmentCode: a.code,
        assessmentName: a.name,
        status: a.status,
        weight: roundWeight(w.weight),
      });
      otherAssessmentsByClo.set(w.cloId, list);
    }
  }

  const currentMap = new Map<string, number>();
  for (const w of currentCloWeights) {
    if (!w.cloId) continue;
    const val = typeof w.weight === 'number' && Number.isFinite(w.weight) && w.weight > 0 ? w.weight : 0;
    currentMap.set(w.cloId, val);
  }

  const result = new Map<string, ISectionCloWeightSummary>();
  for (const cloId of cloIds) {
    const otherWeight = roundWeight(otherSums.get(cloId) ?? 0);
    const currentWeight = roundWeight(currentMap.get(cloId) ?? 0);
    const totalWeight = roundWeight(otherWeight + currentWeight);

    let status: SectionCloWeightStatus = 'UNDER';
    if (totalWeight > 1 + CLO_WEIGHT_EPSILON) {
      status = 'OVER';
    } else if (Math.abs(totalWeight - 1) <= CLO_WEIGHT_EPSILON) {
      status = 'EXACT';
    }

    const remainingWeight = status === 'UNDER' ? roundWeight(Math.max(0, 1 - totalWeight)) : 0;
    const excessWeight = status === 'OVER' ? roundWeight(totalWeight - 1) : 0;

    result.set(cloId, {
      cloId,
      otherWeight,
      currentWeight,
      totalWeight,
      remainingWeight,
      excessWeight,
      status,
      otherAssessments: otherAssessmentsByClo.get(cloId) ?? [],
    });
  }

  return result;
}
