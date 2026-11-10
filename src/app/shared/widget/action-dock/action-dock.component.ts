import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type DockTone = 'error' | 'warning' | 'info' | 'neutral';

/**
 * Thanh dưới cùng của màn hình thao tác: bên trái là thông điệp trạng thái hoặc lỗi (CHỮ + biểu tượng, màu chỉ là
 * tín hiệu phụ), bên phải là các nút hành động (nội dung chiếu vào). `role="status"`/`alert` để trình đọc màn
 * hình đọc được khi thông điệp đổi.
 */
@Component({
  selector: 'app-action-dock',
  template: `
    <div class="sticky bottom-0 z-10 mt-8 border-t border-slate-300 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-3">
        <p class="m-0 flex min-w-0 flex-1 items-center gap-2 text-sm" [class]="toneClass()"
          [attr.role]="tone() === 'error' ? 'alert' : 'status'">
          <i class="fa-solid shrink-0" [class]="iconClass()" aria-hidden="true"></i>
          <span class="wrap-break-word">{{ message() }}</span>
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <ng-content />
        </div>
      </div>
    </div>
  `,
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
