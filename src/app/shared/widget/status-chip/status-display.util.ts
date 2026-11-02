import { UNKNOWN_DISPLAY_ICON, UNKNOWN_DISPLAY_LABEL } from '@constants/measurement-display.constant';
import { IStatusDisplay } from '@models/common/status-display.model';

const MAX_RAW_VALUE_LENGTH = 40;

/** Rút gọn chuỗi dài để không làm vỡ bố cục; chuỗi đầy đủ không được đưa vào giao diện. */
export function truncateText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export interface IResolvedDisplay {
  display: IStatusDisplay;
  /** false khi giá trị thiếu hoặc không nằm trong bảng (enum lạ). */
  known: boolean;
}

/**
 * Tra bảng hiển thị theo giá trị enum của API. Giá trị null, rỗng hoặc lạ (kể cả `constructor`, `__proto__`)
 * trả về kiểu "Không xác định" trung tính, KHÔNG BAO GIỜ rơi về trạng thái hợp lệ hay số 0.
 */
export function resolveStatusDisplay<K extends string>(table: Readonly<Record<K, IStatusDisplay>>, raw: unknown): IResolvedDisplay {
  if (typeof raw === 'string' && Object.hasOwn(table, raw)) {
    return { display: table[raw as K], known: true };
  }
  const isEmpty = raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '');
  const shown = typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean'
    ? truncateText(String(raw), MAX_RAW_VALUE_LENGTH)
    : '';
  return {
    known: false,
    display: {
      label: isEmpty ? 'Chưa có trạng thái' : UNKNOWN_DISPLAY_LABEL,
      description: isEmpty || !shown
        ? 'Hệ thống chưa trả về trạng thái này; không được hiểu là 0 hay trạng thái hợp lệ.'
        : `Giá trị "${shown}" chưa được giao diện hỗ trợ; không được hiểu là 0 hay trạng thái hợp lệ.`,
      icon: UNKNOWN_DISPLAY_ICON,
      tone: 'neutral',
      lineStyle: 'dotted',
    },
  };
}
