import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { VERIFICATION_DISPLAY } from '@constants/measurement-display.constant';
import { StatusChipComponent } from '../status-chip/status-chip.component';
import { resolveStatusDisplay, truncateText } from '../status-chip/status-display.util';

const MAX_NOTE_LENGTH = 200;

/**
 * Huy hiệu trạng thái xác nhận nghiệp vụ UNVERIFIED / NEEDS_CLARIFICATION / VERIFIED của nội dung PLO/PI/CLO
 * và liên kết CLO–PI. Giá trị thiếu hoặc lạ hiển thị là "Không xác định", không bao giờ tự coi là đã xác nhận.
 */
@Component({
  selector: 'app-verification-badge',
  imports: [StatusChipComponent],
  templateUrl: './verification-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationBadgeComponent {
  readonly status = input<string | null | undefined>();
  /** Ghi chú xác nhận (`verification.note`), thêm vào chú thích nếu có. */
  readonly note = input<string | null | undefined>();

  protected readonly resolved = computed(() => resolveStatusDisplay(VERIFICATION_DISPLAY, this.status()));

  protected readonly description = computed(() => {
    const base = this.resolved().display.description;
    const note = this.note();
    return typeof note === 'string' && note.trim() ? `${base} Ghi chú: ${truncateText(note, MAX_NOTE_LENGTH)}` : base;
  });
}
