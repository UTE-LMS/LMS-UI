import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StatusLineStyle, StatusTone } from '@models/common/status-display.model';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

/**
 * Viên huy hiệu trình bày thuần túy, nền tảng của mọi huy hiệu trạng thái dùng chung.
 * Luôn có CHỮ + biểu tượng + kiểu viền; màu chỉ là tín hiệu thứ tư. Chú thích hiện ở tooltip và
 * có sẵn trong văn bản ẩn cho trình đọc màn hình (không phụ thuộc di chuột).
 */
@Component({
  selector: 'app-status-chip',
  imports: [NzTooltipModule],
  templateUrl: './status-chip.component.html',
  styleUrl: './status-chip.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChipComponent {
  readonly label = input.required<string>();
  readonly description = input('');
  /** Lớp Font Awesome, ví dụ `fa-circle-check`. */
  readonly icon = input('');
  readonly tone = input<StatusTone>('neutral');
  readonly lineStyle = input<StatusLineStyle>('solid');
  /** `strong`: nhãn nổi bật (ví dụ "Không chính thức"). */
  readonly emphasis = input<'normal' | 'strong'>('normal');
}
