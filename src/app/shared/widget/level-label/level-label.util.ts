import { PLACEHOLDER } from '@constants/measurement-display.constant';
import { IStatusDisplay } from '@models/common/status-display.model';

export interface ILevelScale {
  min: number;
  max: number;
}

interface ILevelKind {
  /** Tên loại mức: tách bạch "Rubric" với "Bloom" ngay ở nhãn. */
  name: string;
  /** Giải thích loại mức, nhấn mạnh đây không phải điểm và không quy đổi sang loại kia. */
  description: string;
  icon: string;
  tone: IStatusDisplay['tone'];
  lineStyle: IStatusDisplay['lineStyle'];
}

export const RUBRIC_KIND: ILevelKind = {
  name: 'Rubric',
  description: 'Mức rubric (thang 1–4): mức đạt của sinh viên ở một tiêu chí. Không phải mức Bloom, không phải điểm số.',
  icon: 'fa-table-list',
  tone: 'info',
  lineStyle: 'solid',
};

export const BLOOM_KIND: ILevelKind = {
  name: 'Bloom',
  description: 'Mức Bloom (thang 1–6): phân loại mức tư duy của nhiệm vụ. Không phải điểm số, không quy đổi sang mức rubric hay trình độ năng lực.',
  icon: 'fa-layer-group',
  tone: 'accent',
  lineStyle: 'dotted',
};

/**
 * Nhãn của một mức. Chỉ số nguyên nằm trong thang mới hợp lệ; null/thiếu là "Chưa có",
 * giá trị khác (0, 2,5, ngoài thang) là "Không hợp lệ". Không bao giờ hiển thị 0 thay cho thiếu.
 */
export function describeLevel(kind: ILevelKind, scale: ILevelScale, level: unknown): IStatusDisplay {
  const base = { icon: kind.icon, tone: kind.tone, lineStyle: kind.lineStyle };
  if (level === null || level === undefined) {
    return { ...base, tone: 'neutral', lineStyle: 'dashed', label: `${kind.name}: ${PLACEHOLDER.NONE}`, description: kind.description };
  }
  if (typeof level === 'number' && Number.isInteger(level) && level >= scale.min && level <= scale.max) {
    return { ...base, label: `${kind.name}: mức ${level}/${scale.max}`, description: kind.description };
  }
  return {
    ...base,
    tone: 'danger',
    lineStyle: 'dashed',
    label: `${kind.name}: ${PLACEHOLDER.INVALID}`,
    description: `${kind.description} Giá trị nhận được nằm ngoài thang ${scale.min}–${scale.max} nên không được hiển thị như một mức.`,
  };
}
