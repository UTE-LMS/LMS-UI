import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CORRELATION_ID_LABEL } from '@constants/error-message.constant';
import { IUserError, UserErrorKind } from '@models/common/user-error.model';
import { NzButtonModule } from 'ng-zorro-antd/button';

const KIND_ICON: Record<UserErrorKind, string> = {
  VALIDATION: 'fa-circle-exclamation',
  UNAUTHORIZED: 'fa-right-to-bracket',
  FORBIDDEN: 'fa-lock',
  NOT_FOUND: 'fa-magnifying-glass',
  CONFLICT: 'fa-code-compare',
  BUSINESS_RULE: 'fa-scale-balanced',
  SERVER: 'fa-triangle-exclamation',
  NETWORK: 'fa-wifi',
  TIMEOUT: 'fa-clock',
  CLIENT: 'fa-circle-exclamation',
  UNKNOWN: 'fa-circle-exclamation',
};

/**
 * Trạng thái lỗi cho một vùng dữ liệu (danh sách, trang chi tiết): thông báo rõ ràng, mã truy vết,
 * nút "Thử lại" (chỉ khi lỗi tạm thời, dành cho thao tác ĐỌC) và "Tải lại dữ liệu" (khi xung đột 409).
 * Không dùng cho thao tác ghi: người dùng gửi lại form một cách có chủ đích, không có nút thử lại tự động.
 */
@Component({
  selector: 'app-error-state',
  imports: [RouterLink, NzButtonModule],
  templateUrl: './error-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  readonly error = input.required<IUserError>();
  /** Cho phép ẩn nút "Thử lại" ở màn hình mà việc thử lại không an toàn hoặc vô nghĩa. */
  readonly allowRetry = input(true);
  /** Đang thử lại: khóa nút để người dùng không bấm dồn. */
  readonly retrying = input(false);
  /** Đường dẫn quay lại (ví dụ danh sách), hiển thị nút khi có (hợp đồng §3: 404). */
  readonly backLink = input<string | null>(null);
  readonly backLabel = input('Quay lại trang danh sách');

  readonly retry = output<void>();
  readonly reload = output<void>();

  protected readonly correlationLabel = CORRELATION_ID_LABEL;
  protected readonly iconClass = computed(() => `fa-solid ${KIND_ICON[this.error().kind]}`);
  protected readonly canRetry = computed(() => this.allowRetry() && this.error().retryable);
}
