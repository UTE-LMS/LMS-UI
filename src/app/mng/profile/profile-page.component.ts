import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ChangePasswordFormComponent } from '@component-shared/change-password-form/change-password-form.component';
import { UrlConstant } from '@constants/url.constant';
import { IUserProfile } from '@models/auth/auth.model';
import { IUserError } from '@models/common/user-error.model';
import { describeRoleScope, roleLabel } from '@mng/users/users.util';
import { AuthService } from '@services/auth/auth.service';
import { toApiError, toUserError } from '@services/common/api-error.util';
import { FormValidatorService } from '@services/common/form-validator.service';
import { notBlankValidator } from '@validators/trimmed.validator';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { FieldErrorDisplayComponent } from '@widget/field-error-display/field-error-display.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ToastrService } from 'ngx-toastr';
import { catchError, EMPTY, exhaustMap, filter, finalize, Subject, tap } from 'rxjs';

/** Khớp giới hạn của backend (UpdateProfileRequest.fullName). */
const MAX_FULL_NAME_LENGTH = 100;

/**
 * F01 - Tài khoản của tôi: đọc hồ sơ từ GET /api/v1/auth/me (không tin dữ liệu cũ trong localStorage),
 * hiện vai trò và phạm vi được thao tác, cho tự sửa họ tên (PUT /auth/me) và tự đổi mật khẩu.
 * Email, vai trò, khoa và trạng thái do quản trị viên đổi ở màn Người dùng.
 */
@Component({
  selector: 'app-profile-page',
  imports: [
    ReactiveFormsModule,
    NzButtonModule,
    NzInputModule,
    ErrorStateComponent,
    FieldErrorDisplayComponent,
    ChangePasswordFormComponent,
  ],
  templateUrl: './profile-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authSvc = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alert = inject(ToastrService);
  protected readonly formValidSvc = inject(FormValidatorService);

  protected readonly roleLabel = roleLabel;
  protected readonly describeRoleScope = describeRoleScope;
  protected readonly maxFullNameLength = MAX_FULL_NAME_LENGTH;

  readonly profile = signal<IUserProfile | null>(null);
  readonly loading = signal(false);
  readonly error = signal<IUserError | null>(null);
  readonly loggingOut = signal(false);

  readonly nameForm = this.fb.group({
    fullName: ['', [Validators.required, notBlankValidator, Validators.maxLength(MAX_FULL_NAME_LENGTH)]],
  });
  readonly savingName = signal(false);
  /** Lỗi do backend trả khi lưu họ tên. */
  readonly nameErrorMsg = signal('');

  private readonly saveName$ = new Subject<void>();

  constructor() {
    this.setupSaveNameStream();
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.authSvc.getProfile().pipe(
      finalize(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: p => {
        this.profile.set(p);
        this.nameForm.reset({ fullName: p.fullName ?? '' });
      },
      error: (err: unknown) => this.error.set(toUserError(err)),
    });
  }

  onSaveName(): void {
    this.saveName$.next();
  }

  logout(): void {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    this.authSvc.logout().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loggingOut.set(false);
      void this.router.navigateByUrl(UrlConstant.ROUTE.AUTH.LOGIN);
    });
  }

  private setupSaveNameStream(): void {
    this.saveName$.pipe(
      filter(() => {
        this.nameErrorMsg.set('');
        if (this.nameForm.invalid) {
          this.formValidSvc.validateAllFormFields(this.nameForm);
          return false;
        }
        return true;
      }),
      exhaustMap(() => {
        this.savingName.set(true);
        return this.authSvc.updateProfile({ fullName: this.nameForm.getRawValue().fullName.trim() }).pipe(
          tap(updated => {
            this.profile.set(updated);
            this.nameForm.reset({ fullName: updated.fullName });
            this.alert.success('Đã cập nhật họ tên!');
          }),
          catchError((err: unknown) => {
            const api = toApiError(err);
            if (api && api.status < 500) {
              const fieldMessages = api.fieldErrors?.map(item => item.message).join(' ') ?? '';
              this.nameErrorMsg.set(fieldMessages === '' ? api.message : fieldMessages);
            }
            return EMPTY;
          }),
          finalize(() => this.savingName.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }
}
