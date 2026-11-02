import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { ILoginResponse } from '@models/auth/auth.model';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth.service';

const loginResponse = (expiresIn = 3600): ILoginResponse => ({
  accessToken: 'token-gia-lap',
  tokenType: 'Bearer',
  expiresIn,
  user: {
    id: '671dcba5f123456789abcdef',
    username: 'admin',
    email: 'admin@example.test',
    fullName: 'Quản trị thử nghiệm',
    status: 'ACTIVE',
    roleAssignments: [
      { role: 'ADMIN', scope: null },
      { role: 'LECTURER', scope: { programIds: [], courseIds: ['671dcba5f123456789abcd01'], sectionIds: [] } },
    ],
  },
});

describe('AuthService (F01 US-01)', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastrService, useValue: { error: () => undefined } },
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('US-01/AC-1: đăng nhập thành công lưu token, họ tên và vai trò (không trùng lặp)', () => {
    service.login({ username: 'admin', password: 'Password123!' }).subscribe();
    const req = http.expectOne(UrlConstant.API.AUTH_LOGIN);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'admin', password: 'Password123!' });
    req.flush(loginResponse());

    expect(service.getToken()).toBe('token-gia-lap');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getNameOfLogin()).toBe('Quản trị thử nghiệm');
    expect(service.getUserId()).toBe('671dcba5f123456789abcdef');
    expect(service.getUsername()).toBe('admin');
    expect(service.getRoles()).toEqual(['ADMIN', 'LECTURER']);
    expect(service.checkRole(SystemConstant.ROLE.ADMIN)).toBe(true);
    expect(service.checkRole(SystemConstant.ROLE.VIEWER)).toBe(false);
  });

  it('US-01/AC-2: lỗi đăng nhập do form tự hiển thị (INLINE_ERRORS) và không lưu phiên', () => {
    let failed = false;
    service.login({ username: 'admin', password: 'sai-mat-khau' }).subscribe({ error: () => (failed = true) });
    const req = http.expectOne(UrlConstant.API.AUTH_LOGIN);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({ status: 401, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBe('');
  });

  it('phiên quá hạn ghi nhận lúc đăng nhập thì không còn xác thực', () => {
    service.login({ username: 'admin', password: 'Password123!' }).subscribe();
    http.expectOne(UrlConstant.API.AUTH_LOGIN).flush(loginResponse(-1));
    expect(service.isAuthenticated()).toBe(false);
  });

  it('thiếu token hoặc thiếu thông tin người dùng thì không xác thực', () => {
    expect(service.isAuthenticated()).toBe(false);
    service.setToken('chi-co-token');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('US-01/AC-5: đăng xuất gọi POST /auth/logout rồi xóa phiên', () => {
    service.login({ username: 'admin', password: 'Password123!' }).subscribe();
    http.expectOne(UrlConstant.API.AUTH_LOGIN).flush(loginResponse());

    let done = false;
    service.logout().subscribe(() => (done = true));
    const req = http.expectOne(UrlConstant.API.AUTH_LOGOUT);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Đăng xuất thành công' });

    expect(done).toBe(true);
    expect(service.getToken()).toBe('');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('đăng xuất vẫn xóa phiên cục bộ khi backend lỗi (token đã hết hạn, mất mạng)', () => {
    service.login({ username: 'admin', password: 'Password123!' }).subscribe();
    http.expectOne(UrlConstant.API.AUTH_LOGIN).flush(loginResponse());

    let done = false;
    service.logout().subscribe(() => (done = true));
    http.expectOne(UrlConstant.API.AUTH_LOGOUT).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(done).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('đăng xuất khi chưa có token không gọi backend', () => {
    let done = false;
    service.logout().subscribe(() => (done = true));
    http.expectNone(UrlConstant.API.AUTH_LOGOUT);
    expect(done).toBe(true);
  });

  it('hasAnyRole: danh sách rỗng nghĩa là không đòi hỏi vai trò', () => {
    expect(service.hasAnyRole([])).toBe(true);
    expect(service.hasAnyRole(['ADMIN'])).toBe(false);
  });
});
