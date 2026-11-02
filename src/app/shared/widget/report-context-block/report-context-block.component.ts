import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PLACEHOLDER, REPORT_SCOPE_LABEL, RULE_STATUS_DISPLAY } from '@constants/measurement-display.constant';
import { IReportContext, UnofficialReason } from '@models/measurement/report-context.model';
import { StaleWarningComponent } from '../stale-warning/stale-warning.component';
import { StatusChipComponent } from '../status-chip/status-chip.component';
import { resolveStatusDisplay, truncateText } from '../status-chip/status-display.util';
import { UnofficialLabelComponent } from '../unofficial-label/unofficial-label.component';

const MAX_TEXT_LENGTH = 200;
const MAX_LIMITATION_LENGTH = 500;
const HO_CHI_MINH_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const dateTimeFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: HO_CHI_MINH_TIME_ZONE });

function textOrNull(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.trim() !== '' ? truncateText(value, max) : null;
}

/**
 * Khối "phạm vi – quy tắc – phiên bản – giới hạn" bắt buộc đi kèm mọi báo cáo/kết quả đo lường (rule 02).
 * Hiển thị: phạm vi tính, quy tắc (mã, phiên bản, trạng thái), phiên bản CTĐT, lần tính, thời điểm tính,
 * nhãn "Không chính thức", cảnh báo `isStale` và danh sách `limitations`. Mọi khoản thiếu hiện "Chưa có".
 * Component không suy luận: tính chính thức, lý do và giới hạn đều do API cung cấp.
 */
@Component({
  selector: 'app-report-context-block',
  imports: [StatusChipComponent, UnofficialLabelComponent, StaleWarningComponent],
  templateUrl: './report-context-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportContextBlockComponent {
  readonly context = input<IReportContext | null | undefined>();

  protected readonly none = PLACEHOLDER.NONE;

  protected readonly scopeText = computed<string | null>(() => {
    const scope = this.context()?.scope;
    if (!scope) {
      return null;
    }
    const typeLabel = Object.hasOwn(REPORT_SCOPE_LABEL, scope.type)
      ? REPORT_SCOPE_LABEL[scope.type]
      : textOrNull(scope.type, MAX_TEXT_LENGTH) ?? PLACEHOLDER.NONE;
    const parts = [textOrNull(scope.label, MAX_TEXT_LENGTH) ?? textOrNull(scope.refId, MAX_TEXT_LENGTH)];
    if (scope.cohort) {
      parts.push(`khóa ${truncateText(scope.cohort, MAX_TEXT_LENGTH)}`);
    }
    if (scope.termId) {
      parts.push(`học kỳ ${truncateText(scope.termId, MAX_TEXT_LENGTH)}`);
    }
    const detail = parts.filter(Boolean).join(', ');
    return detail ? `${typeLabel}: ${detail}` : typeLabel;
  });

  protected readonly ruleText = computed<string | null>(() => {
    const rule = this.context()?.rule;
    if (!rule) {
      return null;
    }
    const code = textOrNull(rule.code, MAX_TEXT_LENGTH) ?? PLACEHOLDER.NONE;
    const version = textOrNull(rule.version, MAX_TEXT_LENGTH) ?? PLACEHOLDER.NONE;
    return `${code}, phiên bản ${version}`;
  });

  protected readonly ruleStatus = computed(() => {
    const rule = this.context()?.rule;
    return rule ? resolveStatusDisplay(RULE_STATUS_DISPLAY, rule.status).display : null;
  });

  protected readonly programVersionId = computed(() => textOrNull(this.context()?.programVersionId, MAX_TEXT_LENGTH));
  protected readonly runId = computed(() => textOrNull(this.context()?.runId, MAX_TEXT_LENGTH));

  protected readonly calculatedAt = computed<string | null>(() => {
    const raw = this.context()?.calculatedAt;
    if (typeof raw !== 'string' || raw.trim() === '') {
      return null;
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? PLACEHOLDER.INVALID : dateTimeFormat.format(date);
  });

  /** Lý do chưa chính thức: các lý do API trả, cộng lý do DRAFT khi chính trường trạng thái quy tắc cho biết. */
  protected readonly unofficialReasons = computed<UnofficialReason[]>(() => {
    const context = this.context();
    const reasons: UnofficialReason[] = [...(context?.unofficialReasons ?? [])];
    if (context?.rule?.status === 'DRAFT') {
      reasons.push('RULE_DRAFT');
    }
    return reasons;
  });

  protected readonly limitations = computed<string[]>(() => {
    const items = (this.context()?.limitations ?? []).map(item => textOrNull(item, MAX_LIMITATION_LENGTH));
    return items.filter((item): item is string => item !== null);
  });
}
