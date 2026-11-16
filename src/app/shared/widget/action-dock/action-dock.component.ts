import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type DockTone = 'error' | 'warning' | 'info' | 'neutral';

/**
 * Thanh dưới cùng của màn hình thao tác: bên trái là thông điệp trạng thái hoặc lỗi (CHỮ + biểu tượng, màu chỉ là
 * tín hiệu phụ), bên phải là các nút hành động (nội dung chiếu vào). `role="status"`/`alert` để trình đọc màn
 * hình đọc được khi thông điệp đổi.
 */
@Component({
  selector: 'app-action-dock',
  templateUrl: './action-dock.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionDockComponent {
  readonly message = input('');
  readonly tone = input<DockTone>('neutral');

  protected readonly iconClass = computed(() => {
    switch (this.tone()) {
      case 'error': return 'fa-circle-exclamation';
      case 'warning': return 'fa-triangle-exclamation';
      case 'info': return 'fa-circle-info';
      default: return 'fa-circle';
    }
  });

  protected readonly toneClass = computed(() => {
    switch (this.tone()) {
      case 'error': return 'text-[#8c2f39] font-medium';
      case 'warning': return 'text-[#7a4a00] font-medium';
      default: return 'text-slate-700';
    }
  });
}
