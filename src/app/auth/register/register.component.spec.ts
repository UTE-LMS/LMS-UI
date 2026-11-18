import { SocialAuthService } from '@abacritt/angularx-social-login';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { AuthService } from '@services/auth/auth.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { RegisterComponent } from './register.component';

describe('RegisterComponent (trang đăng ký)', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let navigate: ReturnType<typeof vi.fn>;

  const setup = async (session: { signedIn: boolean; admin?: boolean; }): Promise<void> => {
    const authStub = {
      getAuthData: vi.fn(() => (session.signedIn ? { roles: [] } : null)),
      getToken: vi.fn(() => (session.signedIn ? 'token-gia' : '')),
      checkRole: vi.fn((role: string) => session.admin === true && role === SystemConstant.MNG_ROLE.ADMIN),
    };
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
        { provide: SocialAuthService, useValue: {} },
        { provide: ToastrService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: NgxSpinnerService, useValue: { show: vi.fn(), hide: vi.fn() } },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(RegisterComponent);
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('đã đăng nhập (quản trị): chuyển sang trang quản lý, không dựng form và không ném lỗi NG01052', async () => {
    await setup({ signedIn: true, admin: true });
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(navigate).toHaveBeenCalledWith(UrlConstant.ROUTE.MANAGEMENT.DASHBOARD);
    expect(el().querySelector('form')).toBeNull();
  });

  it('đã đăng nhập (không phải quản trị): về trang chủ, không dựng form', async () => {
    await setup({ signedIn: true, admin: false });
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(navigate).toHaveBeenCalledWith(UrlConstant.ROUTE.MAIN.HOMEPAGE);
    expect(el().querySelector('form')).toBeNull();
  });

  it('chưa đăng nhập: hiện form đăng ký (3 ô) và không chuyển trang', async () => {
    await setup({ signedIn: false });
    fixture.detectChanges();
    expect(el().querySelector('form')).not.toBeNull();
    expect(el().querySelectorAll('input').length).toBe(3);
    expect(navigate).not.toHaveBeenCalled();
  });
});
