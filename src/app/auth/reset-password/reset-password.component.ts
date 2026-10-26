import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { IResetPasswordDTO } from '@models/auth/auth.model';
import { MakeForm } from '@models/common/make-form.model';
import { AuthService } from '@services/auth/auth.service';
import { FormValidatorService } from '@services/common/form-validator.service';
import { mustMatch } from '@validators/must-match.validator';
import { FieldErrorDisplayComponent } from '@widget/field-error-display/field-error-display.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['../auth.component.css', './reset-password.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzTooltipModule,
    FieldErrorDisplayComponent,
  ],
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authSvc = inject(AuthService);
  private router = inject(Router);
  private spinner = inject(NgxSpinnerService);
  private alert = inject(ToastrService);
  private activatedRouter = inject(ActivatedRoute);
  protected formValidSvc = inject(FormValidatorService);


  // Ngon ngu hien thi //////////
  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).AUTH.RESET_PASS;
  //////////////////////////////

  form!: FormGroup<MakeForm<IResetPasswordDTO>>;
  showPass = signal(false);
  resetPassToken = '';

  ngOnInit(): void {
    // activatedRouter.queryParams : `?key=value`
    // activatedRouter.params : `/:id` in router config
    this.activatedRouter.queryParams.subscribe({
      next: queryParams => {
        if (queryParams.id) {
          this.resetPassToken = queryParams.id;
          this.createFormGroupLogin();
        } else {
          this.router.navigateByUrl(UrlConstant.ROUTE.AUTH.LOGIN);
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.spinner.hide();
  }

  createFormGroupLogin(): void {
    this.form = this.fb.nonNullable.group({
      password: ['', [Validators.required]],
      repassword: ['', [Validators.required]],
    }, {
      validators: mustMatch('password', 'repassword'),
    });
  }

  toggleShowPassLogin(): void {
    this.showPass.update(prev => !prev);
  }

  onResetPass(): void {
    if (this.form.valid) {
      this.spinner.show();
      this.authSvc.doResetPasswordUpdate(SystemConstant.ROLE.STUDENT, this.form.value, this.resetPassToken)
        .subscribe({
          next: res => {
            if (res.message === 'Success') {
              this.alert.success(this.langData.CAP_NHAT_THANH_CONG);
              this.router.navigateByUrl(UrlConstant.ROUTE.AUTH.LOGIN);
            } else {
              this.router.navigateByUrl(UrlConstant.ROUTE.AUTH.LOGIN);
            }
          },
        });
    } else {
      this.formValidSvc.validateAllFormFields(this.form);
    }
  }
}
