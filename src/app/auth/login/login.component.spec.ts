import { SocialAuthService } from '@abacritt/angularx-social-login';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { AuthService } from '@services/auth/auth.service';
import { Observable, of, Subject, throwError } from 'rxjs';
import { LoginComponent } from './login.component';

const unauthorized = (): HttpErrorResponse => new HttpErrorResponse({
  status: 401,
  error: { timestamp: 't', status: 401, code: 'UNAUTHORIZED', message: 'Tên đăng nhập hoặc mật khẩu không chính xác', path: '/api/v1/auth/login' },
});

describe('LoginComponent (F01 US-01)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let navigate: ReturnType<typeof vi.fn>;
  const authStub = {
    isAuthenticated: vi.fn(() => false),
    login: vi.fn((): Observable<unknown> => of({})),
    loginWithGoogle: vi.fn((): Observable<unknown> => of({})),
    checkRole: vi.fn(() => false),
    hasAnyRole: vi.fn(() => true),
  };

  // Giả lập authState của nút Google: phát ID token (hoặc null khi đăng xuất)
  let googleUser$: Subject<{ idToken?: string; } | null>;
  const socialStub = {
    authState: undefined as unknown as Observable<{ idToken?: string; } | null>,
    signOut: vi.fn(() => Promise.resolve()),
  };

  const setup = async (returnUrl?: string): Promise<void> => {
    googleUser$ = new Subject();
    socialStub.authState = googleUser$.asObservable();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: SocialAuthService, useValue: socialStub },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) } },
        },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const fill = (username: string, password: string): void => {
    component.form.setValue({ username, password });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authStub.isAuthenticated.mockReturnValue(false);
    authStub.login.mockImplementation(() => of({}));
    authStub.loginWithGoogle.mockImplementation(() => of({}));
    socialStub.signOut.mockImplementation(() => Promise.resolve());
  });

  it('form trống: không gọi API và đánh dấu các ô đã chạm để hiện lỗi', async () => {
    await setup();
    component.onSubmit();
    expect(authStub.login).not.toHaveBeenCalled();
    expect(component.form.controls.username.touched).toBe(true);
    expect(component.form.controls.password.touched).toBe(true);
  });

  it('tên đăng nhập dưới 3 ký tự bị chặn ở client', async () => {
    await setup();
    fill('ab', 'Password123!');
    component.onSubmit();
    expect(authStub.login).not.toHaveBeenCalled();
    expect(component.form.controls.username.hasError('minlength')).toBe(true);
  });

  it('đăng nhập thành công: gửi username đã trim + lowercase và vào tổng quan', async () => {
    await setup();
    fill('  Admin ', 'Password123!');
    component.onSubmit();
    expect(authStub.login).toHaveBeenCalledWith({ username: 'admin', password: 'Password123!' });
    expect(navigate).toHaveBeenCalledWith(UrlConstant.ROUTE.MANAGEMENT.DASHBOARD);
  });

  it('có returnUrl nội bộ thì quay lại đúng trang đó', async () => {
    await setup('/mng/users');
    fill('admin', 'Password123!');
    component.onSubmit();
    expect(navigate).toHaveBeenCalledWith('/mng/users');
  });

  it.each(['//evil.example', 'https://evil.example/x', '/auth/login'])('bỏ qua returnUrl không an toàn: %s', async url => {
    await setup(url);
    fill('admin', 'Password123!');
    component.onSubmit();
    expect(navigate).toHaveBeenCalledWith(UrlConstant.ROUTE.MANAGEMENT.DASHBOARD);
  });

  it('401: hiện thông báo chung ngay trong form, giữ nguyên dữ liệu, không chuyển trang', async () => {
    await setup();
    authStub.login.mockImplementation(() => throwError(unauthorized));
    fill('admin', 'sai-mat-khau');
    component.onSubmit();
    fixture.detectChanges();

    expect(component.loginErrorMsg()).toBe('Tên đăng nhập hoặc mật khẩu không chính xác');
    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Tên đăng nhập hoặc mật khẩu không chính xác');
    expect(component.form.getRawValue()).toEqual({ username: 'admin', password: 'sai-mat-khau' });
    expect(navigate).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
  });

  it('400 có fieldErrors: hiện nội dung lỗi từng trường trong form', async () => {
    await setup();
    authStub.login.mockImplementation(() => throwError(() => new HttpErrorResponse({
      status: 400,
      error: {
        timestamp: 't', status: 400, code: 'VALIDATION_ERROR', message: 'Dữ liệu yêu cầu không hợp lệ', path: '/api/v1/auth/login',
        fieldErrors: [{ field: 'password', message: 'Mật khẩu phải từ 8 đến 72 byte' }],
      },
    })));
    fill('admin', 'ngan');
    component.onSubmit();
    expect(component.loginErrorMsg()).toBe('Mật khẩu phải từ 8 đến 72 byte');
  });

  it('chống bấm đúp: bấm hai lần khi đang chờ chỉ gọi API một lần', async () => {
    await setup();
    const pending = new Subject<unknown>();
    authStub.login.mockImplementation(() => pending);
    fill('admin', 'Password123!');
    component.onSubmit();
    component.onSubmit();
    expect(authStub.login).toHaveBeenCalledTimes(1);
    expect(component.isSubmitting()).toBe(true);
    pending.next({});
    pending.complete();
    expect(component.isSubmitting()).toBe(false);
  });

  it('lần gửi sau lỗi xóa thông báo cũ trước khi gọi lại', async () => {
    await setup();
    authStub.login.mockImplementationOnce(() => throwError(unauthorized));
    fill('admin', 'sai');
    component.onSubmit();
    expect(component.loginErrorMsg()).not.toBe('');

    authStub.login.mockImplementationOnce(() => of({}));
    component.onSubmit();
    expect(component.loginErrorMsg()).toBe('');
  });

  it('đã đăng nhập sẵn thì chuyển ngay khỏi trang đăng nhập', async () => {
    authStub.isAuthenticated.mockReturnValue(true);
    socialStub.authState = new Subject<{ idToken?: string; } | null>().asObservable();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: SocialAuthService, useValue: socialStub },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      ],
    }).compileComponents();
    const spy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    TestBed.createComponent(LoginComponent).detectChanges();
    expect(spy).toHaveBeenCalledWith(UrlConstant.ROUTE.MANAGEMENT.DASHBOARD);
  });

  describe('đăng nhập bằng Google (ADR 0016)', () => {
    it('chưa cấu hình client ID: ẩn nút Google và dải phân cách "Hoặc"', async () => {
      await setup();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect((fixture.nativeElement as HTMLElement).querySelector('asl-google-signin-button')).toBeNull();
      expect(text).not.toContain('Hoặc');
    });

    it('nhận ID token từ nút Google: đổi lấy phiên rồi vào trang quản lý và xóa người dùng Google đã lưu', async () => {
      await setup();
      googleUser$.next({ idToken: 'id-token-gia' });
      expect(authStub.loginWithGoogle).toHaveBeenCalledWith('id-token-gia');
      expect(navigate).toHaveBeenCalledWith('/mng/dashboard');
      expect(socialStub.signOut).toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false);
    });

    it('giữ returnUrl nội bộ sau khi đăng nhập Google', async () => {
      await setup('/mng/users');
      googleUser$.next({ idToken: 'id-token-gia' });
      expect(navigate).toHaveBeenCalledWith('/mng/users');
    });

    it('lỗi 401 từ backend (email chưa có tài khoản): hiện thông báo ngay trong thẻ đăng nhập, không chuyển trang', async () => {
      authStub.loginWithGoogle.mockImplementation(() => throwError(() => new HttpErrorResponse({
        status: 401,
        error: { timestamp: 't', status: 401, code: 'UNAUTHORIZED', message: 'Email Google này chưa được cấp tài khoản. Hãy liên hệ quản trị viên', path: '/api/v1/auth/google' },
      })));
      await setup();
      googleUser$.next({ idToken: 'id-token-gia' });
      expect(component.loginErrorMsg()).toContain('chưa được cấp tài khoản');
      expect(navigate).not.toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false);
      expect(socialStub.signOut).toHaveBeenCalled();
    });

    it('bỏ qua phát lại rỗng: null (đã đăng xuất) hoặc người dùng không có idToken không gọi API', async () => {
      await setup();
      googleUser$.next(null);
      googleUser$.next({});
      googleUser$.next({ idToken: '' });
      expect(authStub.loginWithGoogle).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('signOut của thư viện báo lỗi (chưa có người dùng) không làm hỏng luồng đăng nhập', async () => {
      socialStub.signOut.mockImplementation(() => Promise.reject(new Error('Not logged in')));
      await setup();
      googleUser$.next({ idToken: 'id-token-gia' });
      await Promise.resolve();
      expect(navigate).toHaveBeenCalledWith('/mng/dashboard');
    });
  });
});
