import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Nhãn "DỮ LIỆU THỬ NGHIỆM" (CLAUDE.md quy tắc 2, Rubric V4): dữ liệu của hệ thống hiện là dữ liệu giả để
 * chạy thử, không được trình bày như kết quả đo thật. Gắn ở đầu các màn hình nghiệp vụ mới (F04, F05a).
 */
@Component({
  selector: 'app-test-data-flag',
  template: `<span class="inline-flex items-center gap-1 rounded border border-dashed border-slate-500 px-2 py-0.5 text-[11px] font-bold tracking-wide text-slate-700">
    <i class="fa-solid fa-flask" aria-hidden="true"></i>DỮ LIỆU THỬ NGHIỆM</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestDataFlagComponent {}
