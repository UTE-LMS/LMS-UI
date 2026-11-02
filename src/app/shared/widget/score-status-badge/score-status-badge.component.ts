import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SCORE_STATUS_DISPLAY } from '@constants/measurement-display.constant';
import { StatusChipComponent } from '../status-chip/status-chip.component';
import { resolveStatusDisplay } from '../status-chip/status-display.util';

const scoreFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

/**
 * Huy hiệu trạng thái điểm (SCORED/BLANK/ABSENT/NOT_GRADED/EXEMPT/MISSING) kèm giá trị điểm khi có.
 * Quy tắc hiển thị điểm:
 * - SCORED: hiện điểm API trả (kèm "/ tối đa" nếu có).
 * - BLANK: hiện "0", vì đây là 0 có ghi nhận (sinh viên đã dự thi và bỏ trống).
 * - ABSENT/NOT_GRADED/EXEMPT/MISSING và giá trị lạ: KHÔNG BAO GIỜ hiện số, kể cả khi API gửi nhầm `rawScore`.
 */
@Component({
  selector: 'app-score-status-badge',
  imports: [StatusChipComponent],
  templateUrl: './score-status-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreStatusBadgeComponent {
  /** Chuỗi trạng thái từ API; nhận `string` để enum lạ vẫn hiển thị an toàn thay vì lỗi. */
  readonly status = input<string | null | undefined>();
  readonly rawScore = input<number | null | undefined>();
  readonly maxScore = input<number | null | undefined>();

  protected readonly resolved = computed(() => resolveStatusDisplay(SCORE_STATUS_DISPLAY, this.status()));

  protected readonly scoreText = computed<string | null>(() => {
    const status = this.status();
    const raw = this.rawScore();
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return null;
    }
    if (status === 'BLANK') {
      return raw === 0 ? '0' : null;
    }
    if (status !== 'SCORED') {
      return null;
    }
    const max = this.maxScore();
    return typeof max === 'number' && Number.isFinite(max) && max > 0
      ? `${scoreFormat.format(raw)} / ${scoreFormat.format(max)}`
      : scoreFormat.format(raw);
  });

  /** Đã chấm nhưng API không gửi giá trị điểm: nói rõ thay vì để trống hay ngầm hiểu là 0. */
  protected readonly missingScoreValue = computed(() => {
    const raw = this.rawScore();
    return this.status() === 'SCORED' && (typeof raw !== 'number' || !Number.isFinite(raw));
  });
}
