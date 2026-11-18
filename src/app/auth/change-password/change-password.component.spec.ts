import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { AuthService } from '@services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Observable, of } from 'rxjs';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent (F01 trang đổi mật khẩu lần đầu)', () => {
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let component: ChangePasswordComponent;
  let navigate: ReturnType<typeof vi.fn>;
  const authStub = {
    isAuthenticated: vi.fn(() => true),
    mustChangePassword: vi.fn(() => true),
    changePassword: vi.fn((): Observable<unknown> => of({})),
    logout: vi.fn((): Observable<void> => of(undefined)),
  };
  const toastStub = { success: vi.fn(), error: vi.fn() };

  const setup = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: ToastrService, useValue: toastStub },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    authStub.isAuthenticated.mockReturnValue(true);
    authStub.mustChangePassword.mockReturnValue(true);
  });

  it('chưa đăng nhập: chuyển về trang đăng nhập và không hiện form', async () => {
    authStub.isAuthenticated.mockReturnValue(false);
    await setup();
    expect(navigate).toHaveBeenCalledWith(UrlConstant.ROUTE.AUTH.LOGIN);
    expect(el().querySelector('app-change-password-form')).toBeNull();
  });

  it('không còn cờ đổi mật khẩu: chuyển thẳng vào trang quản lý và không hiện form', async () => {
    authStub.mustChangePassword.mockReturnValue(false);
    await setup();
    expect(navigate).toHaveBeenCalledWith(UrlConstant.ROUTE.MANAGEMENT.DASHBOARD);
    expect(el().querySelector('app-change-password-form')).toBeNull();
  });

  it('còn cờ: hiện form đổi mật khẩu', async () => {
    await setup();
    expect(el().querySelector('app-change-password-form')).not.toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('đổi mật khẩu xong (form phát changed): vào trang quản lý', async () => {
    await setup();
    component.onChanged();
    expect(navigate).toHaveBeenCalledWith(UrlConstant.ROUTE.MANAGEMENT.DASHBOARD);
  });

  it('đăng xuất: gọi logout rồi về trang đăng nhập', async () => {
    await setup();
    component.onLogout();
    expect(authStub.logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(UrlConstant.ROUTE.AUTH.LOGIN);
  });
});
