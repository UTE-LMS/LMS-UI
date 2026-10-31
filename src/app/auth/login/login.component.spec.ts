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
    checkRole: vi.fn(() => false),
    hasAnyRole: vi.fn(() => true),
  };

  const setup = async (returnUrl?: string): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authStub },
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
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      ],
    }).compileComponents();
    const spy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    TestBed.createComponent(LoginComponent).detectChanges();
    expect(spy).toHaveBeenCalledWith(UrlConstant.ROUTE.MANAGEMENT.DASHBOARD);
  });
});
