import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { STALE_WARNING_BODY, STALE_WARNING_TITLE } from '@constants/measurement-display.constant';
import { isSafeMessage } from '@services/common/api-error.util';
import { truncateText } from '../status-chip/status-display.util';

const MAX_REASON_LENGTH = 300;

/**
 * Cảnh báo kết quả cũ: điểm trong phạm vi đã được nhập/sửa sau lần tính (`isStale`). Chỉ hiện khi `isStale === true`.
 * `staleReason` do API cung cấp; chỉ hiển thị khi là chuỗi an toàn (không chi tiết nội bộ) và được rút gọn.
 */
@Component({
  selector: 'app-stale-warning',
  templateUrl: './stale-warning.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaleWarningComponent {
  readonly isStale = input<boolean | null | undefined>();
  readonly reason = input<string | null | undefined>();

  protected readonly title = STALE_WARNING_TITLE;
  protected readonly body = STALE_WARNING_BODY;
  protected readonly visible = computed(() => this.isStale() === true);
  protected readonly reasonText = computed<string | null>(() => {
    const reason = this.reason();
    return isSafeMessage(reason) ? truncateText(reason, MAX_REASON_LENGTH) : null;
  });
}
