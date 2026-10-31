import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ModalData } from '@models/common/modal-data.model';
import { IUser } from '@models/user/user.model';
import { httpStatusOf } from '@services/common/api-error.util';
import { UserService } from '@services/user/user.service';
import { BreadCrumb } from '@widget/breadcrumb/breadcrumb.model';
import { BreadcrumbComponent } from '@widget/breadcrumb/breadcumb.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { FormUsersComponent } from '../form-users/form-users.component';

type LoadState = 'loading' | 'ready' | 'notFound' | 'error';

interface ILoadResult {
  state: LoadState;
  modalData: ModalData<IUser> | null;
}

/**
 * Trang thêm (`/mng/users/new`) và sửa (`/mng/users/:id`) người dùng. Chỉ nạp dữ liệu rồi giao cho
 * FormUsersComponent; id lấy từ đường dẫn nhờ withComponentInputBinding().
 */
@Component({
  selector: 'app-detail-users',
  imports: [RouterLink, NzButtonModule, BreadcrumbComponent, FormUsersComponent],
  templateUrl: './detail-users.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailUsersComponent {
  private readonly userSvc = inject(UserService);
  private readonly router = inject(Router);

  readonly id = input<string>();

  protected readonly urlConst = UrlConstant;
  protected readonly state = signal<LoadState>('loading');
  protected readonly modalData = signal<ModalData<IUser> | null>(null);
  /** Tăng lên để nạp lại khi bấm "Thử lại". */
  private readonly reloadTick = signal(0);

  protected readonly breadcrumbObj = computed(() => new BreadCrumb({
    heading: this.id() ? 'Sửa người dùng' : 'Thêm người dùng',
    listBreadcrumb: [
      { title: 'Hệ thống', link: UrlConstant.ROUTE.MANAGEMENT.DASHBOARD },
      { title: 'Người dùng và phân quyền', link: UrlConstant.ROUTE.MANAGEMENT.USERS },
    ],
  }));

  constructor() {
    toObservable(computed(() => ({ id: this.id(), tick: this.reloadTick() }))).pipe(
      tap(() => this.state.set('loading')),
      switchMap(({ id }) => this.load(id)),
      takeUntilDestroyed(),
    ).subscribe(result => {
      this.modalData.set(result.modalData);
      this.state.set(result.state);
    });
  }

  private load(id: string | undefined): Observable<ILoadResult> {
    if (!id) {
      const modal = new ModalData<IUser>();
      modal.action = SystemConstant.ACTION.ADD;
      return of({ state: 'ready', modalData: modal });
    }
    return this.userSvc.getById(id).pipe(
      map((user): ILoadResult => {
        const modal = new ModalData<IUser>();
        modal.action = SystemConstant.ACTION.EDIT;
        modal.data = user;
        return { state: 'ready', modalData: modal };
      }),
      // 400 (id sai định dạng) và 404 đều nghĩa là không có người dùng này; lỗi khác cho phép thử lại
      catchError((err: unknown) => of<ILoadResult>({
        state: [400, 404].includes(httpStatusOf(err)) ? 'notFound' : 'error',
        modalData: null,
      })),
    );
  }

  protected reload(): void {
    this.reloadTick.update(value => value + 1);
  }

  /** Form đóng (lưu xong hoặc hủy) thì về danh sách. */
  protected onFormClosed(): void {
    this.router.navigateByUrl(UrlConstant.ROUTE.MANAGEMENT.USERS);
  }
}
