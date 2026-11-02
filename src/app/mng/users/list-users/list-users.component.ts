import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { createListManagerNoFilter } from '@builder/list-mng-no-filter.builder';
import { UrlConstant } from '@constants/url.constant';
import { IUser, UserStatus } from '@models/user/user.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { UserService } from '@services/user/user.service';
import { BreadCrumb } from '@widget/breadcrumb/breadcrumb.model';
import { BreadcrumbComponent } from '@widget/breadcrumb/breadcumb.component';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { describeScope, roleLabel, scopeIdsTooltip } from '../users.util';

@Component({
  selector: 'app-list-users',
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    NzGridModule,
    NzModalModule,
    NzSwitchModule,
    NzTableModule,
    NzButtonModule,
    BreadcrumbComponent,
    TablePaginateComponent,
  ],
  templateUrl: './list-users.component.html',
  styleUrl: './list-users.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListUsersComponent {
  private readonly userSvc = inject(UserService);
  private readonly authSvc = inject(AuthService);
  private readonly alert = inject(ToastrService);
  private readonly nzModalSvc = inject(NzModalService);

  protected readonly urlConst = UrlConstant;
  protected readonly roleLabel = roleLabel;
  protected readonly describeScope = describeScope;
  protected readonly scopeIdsTooltip = scopeIdsTooltip;
  protected readonly currentUserId = this.authSvc.getUserId();

  readonly breadcrumbObj: BreadCrumb = new BreadCrumb({
    heading: 'Người dùng và phân quyền',
    listBreadcrumb: [{
      title: 'Hệ thống',
      link: UrlConstant.ROUTE.MANAGEMENT.DASHBOARD,
    }],
  });

  /** Dòng đang chờ backend xử lý khóa/mở khóa, để hiện vòng quay trên đúng công tắc. */
  readonly selectedSwitcherId = signal('');

  // Backend chỉ nhận page/size (API-CONTRACT.md §5.3.1) nên bỏ tham số tìm kiếm của builder.
  readonly manager = createListManagerNoFilter<IUser>(
    (page, size) => this.userSvc.filter(page - 1, size),
  );

  /** Bấm công tắc "Cho phép đăng nhập": hỏi xác nhận rồi đổi trạng thái ACTIVE ↔ LOCKED. */
  changeStatus(user: IUser): void {
    const target: UserStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    const isLocking = target === 'LOCKED';

    // Chặn sớm để người dùng hiểu lý do; backend vẫn kiểm tra và trả 422 (US-02/AC-5).
    if (isLocking && user.id === this.currentUserId) {
      this.nzModalSvc.info({
        nzTitle: 'Không thể khóa tài khoản của bạn',
        nzContent: 'Nhờ một quản trị viên khác thực hiện.',
        nzOkText: 'Đã hiểu',
        nzWidth: 420,
      });
      return;
    }

    this.nzModalSvc.confirm({
      nzWidth: 420,
      nzTitle: isLocking ? `Khóa ${user.username}?` : `Mở khóa ${user.username}?`,
      nzContent: isLocking
        ? 'Người này không đăng nhập được nữa. Dữ liệu và lịch sử vẫn giữ. Bạn có thể mở khóa lại.'
        : 'Người này đăng nhập lại được với vai trò hiện có.',
      nzCancelText: 'Hủy',
      nzOkText: isLocking ? 'Khóa tài khoản' : 'Mở khóa',
      nzOkDanger: isLocking,
      nzOnOk: () => this.applyStatus(user, target),
    });
  }

  private applyStatus(user: IUser, target: UserStatus): void {
    const isLocking = target === 'LOCKED';
    this.selectedSwitcherId.set(user.id);
    this.userSvc.updateStatus(user.id, target).subscribe({
      next: () => {
        this.alert.success(isLocking ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
        this.selectedSwitcherId.set('');
        this.manager.triggerReload();
      },
      error: (err: unknown) => {
        this.selectedSwitcherId.set('');
        const api = toApiError(err);
        if (api?.status === 422) {
          // Quy tắc nghiệp vụ, ví dụ quản trị viên ACTIVE cuối cùng: giải thích đúng theo thông điệp của backend.
          this.nzModalSvc.info({
            nzTitle: isLocking ? `Không khóa được ${user.username}` : `Không mở khóa được ${user.username}`,
            nzContent: api.message,
            nzOkText: 'Đã hiểu',
            nzWidth: 420,
          });
        } else if (api && api.status < 500 && api.status !== 403) {
          this.alert.warning(api.status === 404 ? 'Không tìm thấy người dùng này nữa.' : api.message);
        }
        // Công tắc là điều khiển có kiểm soát nên giữ nguyên trạng thái cũ; tải lại để khớp dữ liệu mới nhất.
        this.manager.triggerReload();
      },
    });
  }
}
