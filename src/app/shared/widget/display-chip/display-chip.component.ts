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
  template: `<app-status-chip [label]="display().label" [description]="display().description" [icon]="display().icon"
    [tone]="display().tone" [lineStyle]="display().lineStyle" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisplayChipComponent {
  readonly display = input.required<IStatusDisplay>();
}
