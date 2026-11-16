import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IStatusDisplay } from '@models/common/status-display.model';
import { StatusChipComponent } from '../status-chip/status-chip.component';

/**
 * Huy hiệu trạng thái dựng từ một bản ghi IStatusDisplay (bảng nhãn đặt ở core/constants). Luôn có chữ,
 * biểu tượng và kiểu viền; không bao giờ chỉ dùng màu.
 */
@Component({
  selector: 'app-display-chip',
  imports: [StatusChipComponent],
  templateUrl: './display-chip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisplayChipComponent {
  readonly display = input.required<IStatusDisplay>();
}
