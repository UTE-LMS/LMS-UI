import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Nhãn "DỮ LIỆU THỬ NGHIỆM" (CLAUDE.md quy tắc 2, Rubric V4): dữ liệu của hệ thống hiện là dữ liệu giả để
 * chạy thử, không được trình bày như kết quả đo thật. Gắn ở đầu các màn hình nghiệp vụ mới (F04, F05a).
 */
@Component({
  selector: 'app-test-data-flag',
  templateUrl: './test-data-flag.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestDataFlagComponent {}
