import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ILoginRequest } from '@models/auth/auth.model';
import { MakeForm } from '@models/common/make-form.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { FormValidatorService } from '@services/common/form-validator.service';
import { trimmedMinLength } from '@validators/trimmed.validator';
import { FieldErrorDisplayComponent } from '@widget/field-error-display/field-error-display.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { catchError, EMPTY, exhaustMap, filter, finalize, Subject, tap } from 'rxjs';

/** Thông báo dùng chung khi lỗi 401 không có body chuẩn (sai tài khoản/mật khẩu hoặc tài khoản bị khóa). */
const GENERIC_LOGIN_FAILED = 'Tên đăng nhập hoặc mật khẩu không chính xác';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NzInputModule,
    NzButtonModule,
    FieldErrorDisplayComponent,
  ],
})
export class LoginComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authSvc = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly formValidSvc = inject(FormValidatorService);

  form!: FormGroup<MakeForm<ILoginRequest>>;
  readonly isSubmitting = signal(false);
  /** Thông báo lỗi từ backend (401, 400 không gắn được vào ô nhập), hiển thị ngay trong thẻ đăng nhập. */
  readonly loginErrorMsg = signal('');

  private readonly submit$ = new Subject<void>();

  constructor() {
    this.setupSubmitStream();
  }

  ngOnInit(): void {
    if (this.authSvc.isAuthenticated()) {
      this.router.navigateByUrl(this.resolveTargetUrl());
      return;
    }
    this.form = this.fb.group({
      username: ['', [Validators.required, trimmedMinLength(3)]],
      password: ['', [Validators.required]],
    });
  }

  onSubmit(): void {
    this.submit$.next();
  }

  private setupSubmitStream(): void {
    this.submit$.pipe(
      filter(() => {
        this.loginErrorMsg.set('');
        if (this.form.invalid) {
          this.formValidSvc.validateAllFormFields(this.form);
          return false;
        }
        return true;
      }),
      exhaustMap(() => {
        this.isSubmitting.set(true);
        const raw = this.form.getRawValue();
        // Backend tự trim và lowercase username; làm sẵn ở đây để người dùng thấy giá trị thật sự được gửi.
        const body: ILoginRequest = { username: raw.username.trim().toLowerCase(), password: raw.password };
        return this.authSvc.login(body).pipe(
          tap(() => void this.router.navigateByUrl(this.resolveTargetUrl())),
          catchError((err: unknown) => {
            this.showLoginError(err);
            return EMPTY;
          }),
          finalize(() => this.isSubmitting.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  private showLoginError(err: unknown): void {
    const api = toApiError(err);
    if (api?.status === 400 && api.fieldErrors?.length) {
      this.loginErrorMsg.set(api.fieldErrors.map(item => item.message).join(' '));
    } else if (api?.status === 401) {
      this.loginErrorMsg.set(api.message || GENERIC_LOGIN_FAILED);
    } else if (api && api.status < 500) {
      this.loginErrorMsg.set(api.message);
    }
    // Lỗi 5xx và mất mạng đã được HandlerErrorService báo bằng toast.
  }

  /** returnUrl chỉ nhận đường dẫn nội bộ, tránh chuyển hướng ra trang ngoài. */
  private resolveTargetUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.startsWith(UrlConstant.ROUTE.AUTH.LOGIN)) {
      return returnUrl;
    }
    return this.authSvc.checkRole(SystemConstant.ROLE.STUDENT) && !this.authSvc.hasAnyRole(Object.values(SystemConstant.MNG_ROLE))
      ? UrlConstant.ROUTE.MAIN.HOMEPAGE
      : UrlConstant.ROUTE.MANAGEMENT.DASHBOARD;
  }
}
