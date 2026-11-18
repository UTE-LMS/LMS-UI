import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { ILoginResponse } from '@models/auth/auth.model';
import { Role } from '@models/user/user.model';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth.service';

const loginResponse = (expiresIn = 3600, facultyId?: string, roles: Role[] = ['ADMIN', 'LECTURER']): ILoginResponse => ({
  accessToken: 'token-gia-lap',
  tokenType: 'Bearer',
  expiresIn,
  user: {
    id: '671dcba5f123456789abcdef',
    username: 'admin',
    email: 'admin@example.test',
    fullName: 'Quản trị thử nghiệm',
    status: 'ACTIVE',
    facultyId,
    roles,
  },
});

describe('AuthService (F01 US-01 & M01 Faculty Scope)', () => {
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
    expect(service.checkRole(SystemConstant.ROLE.QA)).toBe(false);
  });

  it('lưu trữ và trích xuất facultyId, nhận diện PROGRAM_MANAGER chính xác', () => {
    expect(service.getFacultyId()).toBeUndefined();
    expect(service.isProgramManager()).toBe(false);

    service.login({ username: 'pm_user', password: 'Password123!' }).subscribe();
    const req = http.expectOne(UrlConstant.API.AUTH_LOGIN);
    req.flush(loginResponse(3600, '671dcba5f123456789abcde0', ['PROGRAM_MANAGER']));

    expect(service.getFacultyId()).toBe('671dcba5f123456789abcde0');
    expect(service.isProgramManager()).toBe(true);
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

  it('F01/đổi mật khẩu lần đầu: đăng nhập lưu cờ mustChangePassword từ backend', () => {
    expect(service.mustChangePassword()).toBe(false);
    service.login({ username: 'gv_moi', password: 'Password123!' }).subscribe();
    const res = loginResponse();
    res.user.mustChangePassword = true;
    http.expectOne(UrlConstant.API.AUTH_LOGIN).flush(res);
    expect(service.mustChangePassword()).toBe(true);
  });

  it('F01/đổi mật khẩu lần đầu: backend không gửi cờ (tài khoản cũ) thì coi là false', () => {
    service.login({ username: 'admin', password: 'Password123!' }).subscribe();
    http.expectOne(UrlConstant.API.AUTH_LOGIN).flush(loginResponse());
    expect(service.mustChangePassword()).toBe(false);
  });

  it('F01/đổi mật khẩu lần đầu: đổi thành công thay token mới và tắt cờ', () => {
    service.login({ username: 'gv_moi', password: 'Password123!' }).subscribe();
    const first = loginResponse();
    first.user.mustChangePassword = true;
    http.expectOne(UrlConstant.API.AUTH_LOGIN).flush(first);

    service.changePassword({ currentPassword: 'Password123!', newPassword: 'MatKhauMoi456!' }).subscribe();
    const req = http.expectOne(UrlConstant.API.AUTH_CHANGE_PASSWORD);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ currentPassword: 'Password123!', newPassword: 'MatKhauMoi456!' });
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({ ...loginResponse(), accessToken: 'token-moi' });

    expect(service.getToken()).toBe('token-moi');
    expect(service.mustChangePassword()).toBe(false);
  });

  it('F01/đổi mật khẩu lần đầu: lỗi 422 (sai mật khẩu hiện tại) giữ nguyên phiên và cờ', () => {
    service.login({ username: 'gv_moi', password: 'Password123!' }).subscribe();
    const first = loginResponse();
    first.user.mustChangePassword = true;
    http.expectOne(UrlConstant.API.AUTH_LOGIN).flush(first);

    let failed = false;
    service.changePassword({ currentPassword: 'sai', newPassword: 'MatKhauMoi456!' }).subscribe({ error: () => (failed = true) });
    http.expectOne(UrlConstant.API.AUTH_CHANGE_PASSWORD)
      .flush({ status: 422, message: 'Mật khẩu hiện tại không chính xác' }, { status: 422, statusText: 'Unprocessable Entity' });

    expect(failed).toBe(true);
    expect(service.getToken()).toBe('token-gia-lap');
    expect(service.mustChangePassword()).toBe(true);
  });

  it('F01/trang profile: sửa họ tên gọi PUT /auth/me và cập nhật tên lưu ở trình duyệt, giữ nguyên token và vai trò', () => {
    service.login({ username: 'admin', password: 'Password123!' }).subscribe();
    http.expectOne(UrlConstant.API.AUTH_LOGIN).flush(loginResponse());

    service.updateProfile({ fullName: 'Tên mới' }).subscribe();
    const req = http.expectOne(UrlConstant.API.AUTH_ME);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ fullName: 'Tên mới' });
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({ ...loginResponse().user, fullName: 'Tên mới' });

    expect(service.getNameOfLogin()).toBe('Tên mới');
    expect(service.getToken()).toBe('token-gia-lap');
    expect(service.getRoles()).toEqual(['ADMIN', 'LECTURER']);
  });

  it('F01/trang profile: sửa họ tên bị lỗi 400 thì giữ nguyên tên đang lưu', () => {
    service.login({ username: 'admin', password: 'Password123!' }).subscribe();
    http.expectOne(UrlConstant.API.AUTH_LOGIN).flush(loginResponse());

    let failed = false;
    service.updateProfile({ fullName: '' }).subscribe({ error: () => (failed = true) });
    http.expectOne(UrlConstant.API.AUTH_ME)
      .flush({ status: 400, message: 'Họ và tên không được để trống' }, { status: 400, statusText: 'Bad Request' });

    expect(failed).toBe(true);
    expect(service.getNameOfLogin()).toBe('Quản trị thử nghiệm');
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

  it('US-01: getProfile đọc hồ sơ từ GET /auth/me, lỗi do màn hình tự hiển thị (INLINE_ERRORS)', () => {
    service.getProfile().subscribe(p => expect(p.username).toBe('gv.test'));
    const req = http.expectOne(UrlConstant.API.AUTH_ME);
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({ id: 'u1', username: 'gv.test', email: '', fullName: '', status: 'ACTIVE', roles: [] });
  });

  it('doLoginForm và doLoginGoogle gọi đúng endpoint', () => {
    service.doLoginForm({ email: 'test@example.com', password: '123' }).subscribe();
    const reqForm = http.expectOne(UrlConstant.API.LOGIN_ADMIN);
    expect(reqForm.request.method).toBe('POST');
    reqForm.flush({});

    service.doLoginGoogle('mock-token').subscribe();
    const reqGoogle = http.expectOne(`${UrlConstant.API.LOGIN_ADMIN}/google`);
    expect(reqGoogle.request.method).toBe('POST');
    expect(reqGoogle.request.headers.get('accessToken')).toBe('mock-token');
    reqGoogle.flush({});
  });

  it('doRegisterForm và doResetPassword gọi đúng endpoint cho STUDENT và từ chối vai trò khác', () => {
    service.doRegisterForm('STUDENT', { email: 'st@example.com' }).subscribe();
    const regReq = http.expectOne(`${UrlConstant.API.LOGIN_ADMIN}/register`);
    expect(regReq.request.method).toBe('POST');
    regReq.flush({ message: 'Success' });

    let unsuppMessage = '';
    service.doRegisterForm('OTHER', {}).subscribe(res => {
      unsuppMessage = res.message;
    });
    expect(unsuppMessage).toBeTruthy();

    service.doResetPasswordRequest('STUDENT', { email: 'st@example.com' }).subscribe();
    const reqForgot = http.expectOne(`${UrlConstant.API.LOGIN_ADMIN}/forgot-password`);
    expect(reqForgot.request.method).toBe('POST');
    reqForgot.flush({ message: 'Sent' });

    service.doResetPasswordRequest('OTHER', {}).subscribe(res => {
      unsuppMessage = res.message;
    });
    expect(unsuppMessage).toBeTruthy();

    service.doResetPasswordUpdate('STUDENT', { password: 'new' }, 'ts123').subscribe();
    const reqReset = http.expectOne(`${UrlConstant.API.LOGIN_ADMIN}/reset-password`);
    expect(reqReset.request.headers.get('thiSinhId')).toBe('ts123');
    reqReset.flush({ message: 'Updated' });

    service.doResetPasswordUpdate('OTHER', {}, 'ts123').subscribe(res => {
      unsuppMessage = res.message;
    });
    expect(unsuppMessage).toBeTruthy();
  });
});
