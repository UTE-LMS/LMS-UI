import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ChangePasswordFormComponent } from '@component-shared/change-password-form/change-password-form.component';
import { UrlConstant } from '@constants/url.constant';
import { AuthService } from '@services/auth/auth.service';

/**
 * Trang bắt buộc đổi mật khẩu lần đầu cho tài khoản do Admin tạo (F01). Chỉ vào được khi đã đăng nhập
 * và cờ mustChangePassword còn bật; đổi xong backend trả token mới và người dùng vào thẳng trang quản lý.
 * Form nằm ở ChangePasswordFormComponent (dùng chung với trang Tài khoản của tôi).
 */
@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrl: '../auth.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChangePasswordFormComponent],
})
export class ChangePasswordComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSvc = inject(AuthService);
  private readonly router = inject(Router);

  /** false trong lúc đang chuyển hướng đi nơi khác, để không nháy form. */
  readonly ready = signal(false);

  ngOnInit(): void {
    if (!this.authSvc.isAuthenticated()) {
      void this.router.navigateByUrl(UrlConstant.ROUTE.AUTH.LOGIN);
      return;
    }
    if (!this.authSvc.mustChangePassword()) {
      void this.router.navigateByUrl(UrlConstant.ROUTE.MANAGEMENT.DASHBOARD);
      return;
    }
    this.ready.set(true);
  }

  onChanged(): void {
    void this.router.navigateByUrl(UrlConstant.ROUTE.MANAGEMENT.DASHBOARD);
  }

  /** Thoát khi không muốn đổi ngay: xóa phiên và về trang đăng nhập. */
  onLogout(): void {
    this.authSvc.logout().pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.router.navigateByUrl(UrlConstant.ROUTE.AUTH.LOGIN));
  }
}
