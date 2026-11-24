import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { IUserProfile } from '@models/auth/auth.model';
import { IUserError } from '@models/common/user-error.model';
import { describeRoleScope, FacultyLookupMap, roleLabel } from '@mng/users/users.util';
import { AuthService } from '@services/auth/auth.service';
import { toUserError } from '@services/common/api-error.util';
import { FacultyService } from '@services/faculty/faculty.service';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { catchError, finalize, of } from 'rxjs';

/**
 * F01 - Tài khoản của tôi: đọc hồ sơ từ GET /api/v1/auth/me (không tin dữ liệu cũ trong localStorage),
 * hiện vai trò và phạm vi được thao tác. Đổi vai trò/phạm vi do quản trị viên làm ở màn Người dùng.
 */
@Component({
  selector: 'app-profile-page',
  imports: [NzButtonModule, ErrorStateComponent],
  templateUrl: './profile-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSvc = inject(AuthService);
  private readonly facultySvc = inject(FacultyService);
  private readonly router = inject(Router);

  protected readonly roleLabel = roleLabel;
  protected readonly describeRoleScope = describeRoleScope;

  readonly profile = signal<IUserProfile | null>(null);
  readonly facultyMap = signal<FacultyLookupMap>(new Map());
  readonly loading = signal(false);
  readonly error = signal<IUserError | null>(null);
  readonly loggingOut = signal(false);

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
        if (p.facultyId && !p.facultyCode && !p.facultyName) {
          this.facultySvc.getFacultyById(p.facultyId).pipe(
            catchError(() => of(null)),
            takeUntilDestroyed(this.destroyRef),
          ).subscribe(fac => {
            if (fac) {
              this.facultyMap.set(new Map([[fac.id, fac]]));
            }
          });
        }
      },
      error: (err: unknown) => this.error.set(toUserError(err)),
    });
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
}
