import { GoogleLoginProvider, SocialAuthService, SocialLoginModule } from '@abacritt/angularx-social-login';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { ILoginDTO, IResetPasswordRequsetDTO } from '@models/auth/auth.model';
import { MakeForm } from '@models/common/make-form.model';
import { AuthService } from '@services/auth/auth.service';
import { FormValidatorService } from '@services/common/form-validator.service';
import { emailValidator } from '@validators/email.validator';
import { FieldErrorDisplayComponent } from '@widget/field-error-display/field-error-display.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { timer } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['../auth.component.css', './login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzModalModule,
    NzTooltipModule,
    NzDividerModule,
    NzCheckboxModule,
    NzSpinModule,
    FieldErrorDisplayComponent,
    SocialLoginModule,
  ],
})
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authSvc = inject(AuthService);
  private socialLoginSvc = inject(SocialAuthService);
  private router = inject(Router);
  private spinner = inject(NgxSpinnerService);
  private alert = inject(ToastrService);
  protected formValidSvc = inject(FormValidatorService);


  // Ngon ngu hien thi //////////
  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).AUTH.LOGIN;
  //////////////////////////////

  formLogin!: FormGroup<MakeForm<ILoginDTO>>;
  formResetPass!: FormGroup<MakeForm<IResetPasswordRequsetDTO>>;
  showPassLogin = signal(false);
  isShowFogotPass = signal(false);
  isLoadingGoogle = signal(true);
  listRoles = SystemConstant.ROLE_TITLE;

  ngOnInit(): void {
    if (this.authSvc.getAuthData() && this.authSvc.getToken()) {
      if (this.authSvc.checkRole(SystemConstant.ROLE.STUDENT)) {
        this.router.navigateByUrl(UrlConstant.ROUTE.MAIN.HOMEPAGE);
      } else {
        this.router.navigateByUrl(UrlConstant.ROUTE.MANAGEMENT.DASHBOARD);
      }
    } else {
      this.createFormGroupLogin();
      this.createFormForgotPass();
      timer(1500).subscribe(() => {
        this.isLoadingGoogle.set(false);
      });
    }
  }

  ngOnDestroy(): void {
    this.spinner.hide();
  }

  createFormGroupLogin(): void {
    this.formLogin = this.fb.nonNullable.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]],
      remember: [true],
    });
  }

  createFormForgotPass(): void {
    this.formResetPass = this.fb.nonNullable.group({
      email: ['', [Validators.required, emailValidator]],
    });
  }

  toggleShowPassLogin(): void {
    this.showPassLogin.update(prev => !prev);
  }

  onLoginWithForm(): void {
    if (this.formLogin.valid) {
      this.spinner.show();
      this.authSvc.doLoginForm(this.formLogin.value)
        .subscribe({
          next: res => {
            if (res) {
              this.authSvc.setToken(res?.token ?? '');
              delete res.token;
              this.authSvc.setAuthData(res);
              this.router.navigateByUrl(UrlConstant.ROUTE.MAIN.HOMEPAGE);
            } else {
              this.alert.error(this.langData.TAI_KHOAN_KHONG_CO_QUYEN);
            }
          },
        });
    } else {
      this.formValidSvc.validateAllFormFields(this.formLogin);
    }
  }

  onLoginWithGoogle(): void {
    this.socialLoginSvc.getAccessToken(GoogleLoginProvider.PROVIDER_ID).then(accessToken => {
      if (accessToken) {
        this.spinner.show();
        this.authSvc.doLoginGoogle(accessToken)
          .subscribe({
            next: res => {
              this.authSvc.setToken(res?.token ?? '');
              delete res.token;
              this.authSvc.setAuthData(res);
              this.router.navigateByUrl(UrlConstant.ROUTE.MANAGEMENT.DASHBOARD);
            },
          });
      }
    });
  }

  requestFogotPassword() {
    if (this.formResetPass.valid) {
      this.authSvc.doResetPasswordRequest(SystemConstant.ROLE.STUDENT, this.formResetPass.value)
        .subscribe({
          next: res => {
            if (res.message === 'Success') {
              this.alert.success(this.langData.DA_GUI_YEU_CAU_CAP_LAI_MAT_KHAU);
              this.isShowFogotPass.set(false);
              this.formResetPass.reset();
            }
          },
        });
    } else {
      this.formValidSvc.validateAllFormFields(this.formResetPass);
    }
  }
}
