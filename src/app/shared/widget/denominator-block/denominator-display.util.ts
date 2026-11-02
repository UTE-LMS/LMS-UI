import { PLACEHOLDER } from '@constants/measurement-display.constant';

const countFormat = new Intl.NumberFormat('vi-VN');
const percentFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** Dưới ngưỡng này làm tròn 1 chữ số sẽ ra "0%" dù thực tế khác 0 nên phải ghi "< 0,1%". */
const MIN_VISIBLE_RATE = 0.0005;
/** Từ ngưỡng này làm tròn ra "100%" dù chưa tới 100% nên phải ghi "> 99,9%". */
const MAX_VISIBLE_RATE = 0.9995;

/** Số đếm hợp lệ là số nguyên không âm; mọi thứ khác (null, NaN, âm, số thập phân) coi như chưa có. */
export function asCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

export function formatCount(value: unknown): string {
  const count = asCount(value);
  return count === null ? PLACEHOLDER.NONE : countFormat.format(count);
}

/**
 * Định dạng tỷ lệ 0–1 của API thành phần trăm. CHỈ định dạng hiển thị, không tính lại số đo:
 * giá trị thiếu hoặc ngoài [0, 1] trả về null để nơi gọi hiện "Chưa có"/"Không hợp lệ" thay vì "0%".
 * Tỷ lệ 0 thật (có mẫu số dương, không ai đạt) vẫn hiển thị "0%".
 */
export function formatRatePercent(rate: unknown): string | null {
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 1) {
    return null;
  }
  if (rate > 0 && rate < MIN_VISIBLE_RATE) {
    return '< 0,1%';
  }
  if (rate < 1 && rate >= MAX_VISIBLE_RATE) {
    return '> 99,9%';
  }
  return `${percentFormat.format(rate * 100)}%`;
}

export type RateState = 'value' | 'none' | 'insufficient' | 'invalid';

export interface IRateDisplay {
  state: RateState;
  text: string;
}

/**
 * Quyết định hiển thị một tỷ lệ theo mẫu số của nó:
 * - mẫu số chưa biết: "Chưa có";
 * - mẫu số 0: `zeroDenominatorText` (không bao giờ "0%");
 * - có mẫu số dương nhưng API trả tỷ lệ null: "Chưa có";
 * - tỷ lệ ngoài [0, 1] hoặc NaN: "Không hợp lệ".
 */
export function displayRate(rate: number | null | undefined, denominator: unknown, zeroDenominatorText: string): IRateDisplay {
  const base = asCount(denominator);
  if (base === null) {
    return { state: 'none', text: PLACEHOLDER.NONE };
  }
  if (base === 0) {
    return { state: zeroDenominatorText === PLACEHOLDER.INSUFFICIENT ? 'insufficient' : 'none', text: zeroDenominatorText };
  }
  if (rate === null || rate === undefined) {
    return { state: 'none', text: PLACEHOLDER.NONE };
  }
  const percent = formatRatePercent(rate);
  return percent === null ? { state: 'invalid', text: PLACEHOLDER.INVALID } : { state: 'value', text: percent };
}
