import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MakeForm } from '@models/common/make-form.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { FormValidatorService } from '@services/common/form-validator.service';
import { mustMatch } from '@validators/must-match.validator';
import { FieldErrorDisplayComponent } from '@widget/field-error-display/field-error-display.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ToastrService } from 'ngx-toastr';
import { catchError, EMPTY, exhaustMap, filter, finalize, Subject, tap } from 'rxjs';

/** Độ dài tối thiểu theo chính sách mật khẩu của backend (8-72 bytes UTF-8, backend là nơi kiểm tra chính thức). */
const MIN_PASSWORD_LENGTH = 8;

interface IChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Form đổi mật khẩu (POST /api/v1/auth/change-password) dùng chung cho trang đổi mật khẩu lần đầu và trang
 * Tài khoản của tôi. Đổi thành công thì backend trả token mới (AuthService lưu lại), form tự xóa trắng và
 * phát sự kiện `changed` để nơi dùng quyết định bước tiếp theo (chuyển trang hoặc ở lại).
 */
@Component({
  selector: 'app-change-password-form',
  templateUrl: './change-password-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    FieldErrorDisplayComponent,
  ],
})
export class ChangePasswordFormComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authSvc = inject(AuthService);
  private readonly alert = inject(ToastrService);
  protected readonly formValidSvc = inject(FormValidatorService);

  protected readonly minLength = MIN_PASSWORD_LENGTH;

  readonly changed = output<void>();

  readonly form: FormGroup<MakeForm<IChangePasswordForm>> = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
    confirmPassword: ['', [Validators.required]],
  }, {
    validators: mustMatch('newPassword', 'confirmPassword'),
  });

  readonly isSubmitting = signal(false);
  /** Lỗi do backend trả (sai mật khẩu hiện tại, mật khẩu mới trùng cũ, vi phạm chính sách mật khẩu). */
  readonly errorMsg = signal('');

  private readonly submit$ = new Subject<void>();

  constructor() {
    this.setupSubmitStream();
  }

  onSubmit(): void {
    this.submit$.next();
  }

  private setupSubmitStream(): void {
    this.submit$.pipe(
      filter(() => {
        this.errorMsg.set('');
        if (this.form.invalid) {
          this.formValidSvc.validateAllFormFields(this.form);
          return false;
        }
        return true;
      }),
      exhaustMap(() => {
        this.isSubmitting.set(true);
        const raw = this.form.getRawValue();
        return this.authSvc.changePassword({ currentPassword: raw.currentPassword, newPassword: raw.newPassword }).pipe(
          tap(() => {
            this.form.reset();
            this.alert.success('Đổi mật khẩu thành công!');
            this.changed.emit();
          }),
          catchError((err: unknown) => {
            const api = toApiError(err);
            if (api && api.status < 500) {
              const fieldMessages = api.fieldErrors?.map(item => item.message).join(' ') ?? '';
              this.errorMsg.set(fieldMessages === '' ? api.message : fieldMessages);
            }
            // Lỗi 5xx và mất mạng đã được HandlerErrorService báo bằng toast.
            return EMPTY;
          }),
          finalize(() => this.isSubmitting.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }
}
