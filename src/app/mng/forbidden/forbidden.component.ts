import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { AuthService } from '@services/auth/auth.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { roleLabel } from '../users/users.util';

/**
 * Trang "Không có quyền": người dùng đã đăng nhập nhưng vai trò không được vào trang họ vừa mở.
 * Gõ thẳng đường dẫn cũng dẫn tới đây (guard) và không đá về đăng nhập vì họ đã xác thực.
 */
@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, NzButtonModule],
  templateUrl: './forbidden.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenComponent {
  private readonly authSvc = inject(AuthService);

  protected readonly urlConst = UrlConstant;
  protected readonly username = this.authSvc.getUsername();
  protected readonly roles = this.authSvc.getRoles().map(roleLabel).join(', ');
}
