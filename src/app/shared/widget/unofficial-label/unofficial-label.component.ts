import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  UNOFFICIAL_DEFAULT_DESCRIPTION, UNOFFICIAL_LABEL, UNOFFICIAL_REASON_LABEL,
} from '@constants/measurement-display.constant';
import { StatusChipComponent } from '../status-chip/status-chip.component';
import { truncateText } from '../status-chip/status-display.util';

const MAX_UNKNOWN_REASON_LENGTH = 40;

/**
 * Nhãn nổi bật "Không chính thức" cho kết quả từ quy tắc DRAFT/chưa CONFIRMED hoặc liên kết CLO–PI chưa VERIFIED.
 * Chỉ khi `isOfficial === true` nhãn mới ẩn; `false`, `null` hay thiếu đều hiện (chưa biết thì coi là chưa chính thức).
 * Component không tự quyết định tính chính thức: giá trị `isOfficial` và lý do đến từ API.
 */
@Component({
  selector: 'app-unofficial-label',
  imports: [StatusChipComponent],
  templateUrl: './unofficial-label.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnofficialLabelComponent {
  readonly isOfficial = input<boolean | null | undefined>();
  /** Mã lý do (RULE_DRAFT, RULE_NOT_CONFIRMED, LINK_NOT_VERIFIED); mã lạ vẫn được hiển thị an toàn. */
  readonly reasons = input<readonly string[] | null | undefined>();

  protected readonly label = UNOFFICIAL_LABEL;
  protected readonly visible = computed(() => this.isOfficial() !== true);

  protected readonly reasonTexts = computed<string[]>(() => {
    const unique = [...new Set((this.reasons() ?? []).filter(code => typeof code === 'string' && code.trim() !== ''))];
    return unique.map(code => this.reasonText(code));
  });

  protected readonly description = computed(() => [UNOFFICIAL_DEFAULT_DESCRIPTION, ...this.reasonTexts()].join(' '));

  private reasonText(code: string): string {
    if (Object.hasOwn(UNOFFICIAL_REASON_LABEL, code)) {
      return UNOFFICIAL_REASON_LABEL[code as keyof typeof UNOFFICIAL_REASON_LABEL];
    }
    return `Lý do khác (mã: ${truncateText(code, MAX_UNKNOWN_REASON_LENGTH)}).`;
  }
}
