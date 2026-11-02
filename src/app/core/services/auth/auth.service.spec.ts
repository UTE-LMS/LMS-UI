import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SystemConstant } from '@constants/system.constant';
import { environment } from '@env';
import { IAuthData } from '@models/auth/auth.model';
import { sha256 } from 'js-sha256';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth.service';

const LOGIN_API = 'rest/login';

/** DỮ LIỆU THỬ NGHIỆM: người dùng giả, không phải tài khoản thật. */
const AUTH_DATA: IAuthData = {
  avatar: 'avatar-gia.png', expired: 4_102_444_800, roles: ['ROLE_ADMIN'], fullName: 'Người dùng thử nghiệm',
};

function setup() {
  const toastr = { error: vi.fn() };
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastrService, useValue: toastr }],
  });
  return { service: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController), toastr };
}

describe('US-01: AuthService — lưu và kiểm tra thông tin đăng nhập ở trình duyệt', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('token', () => {
    it('chưa đăng nhập thì getToken trả về chuỗi rỗng (không phải null/undefined)', () => {
      expect(setup().service.getToken()).toBe('');
    });

    it('setToken rồi getToken trả về đúng giá trị', () => {
      const { service } = setup();
      service.setToken('jwt-gia');
      expect(service.getToken()).toBe('jwt-gia');
      expect(localStorage.getItem(SystemConstant.CURRENT_INFO)).toBe('jwt-gia');
    });
  });

  describe('setAuthData / getAuthData (có băm kiểm tra toàn vẹn)', () => {
    it('lưu dữ liệu cùng mã băm sha256(dữ liệu + khóa) và đọc lại đúng', () => {
      const { service, toastr } = setup();
      service.setAuthData(AUTH_DATA);
      const raw = JSON.stringify(AUTH_DATA);
      expect(localStorage.getItem(SystemConstant.CURRENT_INFO_DATA)).toBe(raw);
      expect(localStorage.getItem(SystemConstant.CURRENT_INFO_SKEY)).toBe(sha256(raw + environment.keyGoogle));
      expect(service.getAuthData()).toEqual(AUTH_DATA);
      expect(toastr.error).not.toHaveBeenCalled();
    });

    it('chưa có dữ liệu thì trả về null (ca biên)', () => {
      expect(setup().service.getAuthData()).toBeNull();
    });

    it('dữ liệu bị sửa tay (vd. tự thêm ROLE_ADMIN): báo lỗi và đăng xuất sau 1 giây (ca âm)', () => {
      vi.useFakeTimers();
      const { service, toastr } = setup();
      const logout = vi.spyOn(service, 'doLogout').mockReturnValue(true);
      service.setAuthData({ ...AUTH_DATA, roles: ['ROLE_STUDENT'] });
      const tampered = JSON.stringify({ ...AUTH_DATA, roles: ['ROLE_ADMIN'] });
      localStorage.setItem(SystemConstant.CURRENT_INFO_DATA, tampered);

      service.getAuthData();

      expect(toastr.error).toHaveBeenCalledTimes(1);
      expect(logout).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(logout).toHaveBeenCalledWith('/');
    });

    it('thiếu mã băm cũng bị coi là không toàn vẹn', () => {
      vi.useFakeTimers();
      const { service, toastr } = setup();
      vi.spyOn(service, 'doLogout').mockReturnValue(true);
      localStorage.setItem(SystemConstant.CURRENT_INFO_DATA, JSON.stringify(AUTH_DATA));
      service.getAuthData();
      expect(toastr.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('thông tin hiển thị', () => {
    it('getNameOfLogin và getAvatarOfLogin lấy từ dữ liệu đã lưu', () => {
      const { service } = setup();
      localStorage.setItem(SystemConstant.CURRENT_INFO_DATA, JSON.stringify(AUTH_DATA));
      expect(service.getNameOfLogin()).toBe('Người dùng thử nghiệm');
      expect(service.getAvatarOfLogin()).toBe('avatar-gia.png');
    });

    it('chưa đăng nhập thì trả về chuỗi rỗng (ca biên)', () => {
      const { service } = setup();
      expect(service.getNameOfLogin()).toBe('');
      expect(service.getAvatarOfLogin()).toBe('');
    });
  });

  describe('US-02/AC-4: checkRole', () => {
    it('true khi người dùng có đúng vai trò', () => {
      const { service } = setup();
      service.setAuthData(AUTH_DATA);
      expect(service.checkRole('ROLE_ADMIN')).toBe(true);
    });

    it('false khi thiếu vai trò, chưa đăng nhập hoặc dữ liệu không có roles (ca âm)', () => {
      const { service } = setup();
      expect(service.checkRole('ROLE_ADMIN')).toBe(false);
      service.setAuthData({ ...AUTH_DATA, roles: undefined as unknown as string[] });
      expect(service.checkRole('ROLE_ADMIN')).toBe(false);
      service.setAuthData({ ...AUTH_DATA, roles: ['ROLE_STUDENT'] });
      expect(service.checkRole('ROLE_ADMIN')).toBe(false);
    });
  });

  describe('doLogout', () => {
    function fillStorage(service: AuthService): void {
      service.setToken('jwt-gia');
      service.setAuthData(AUTH_DATA);
    }

    it('xóa token, dữ liệu người dùng và mã băm', () => {
      const { service } = setup();
      fillStorage(service);
      expect(service.doLogout()).toBe(true);
      expect(localStorage.getItem(SystemConstant.CURRENT_INFO)).toBeNull();
      expect(localStorage.getItem(SystemConstant.CURRENT_INFO_DATA)).toBeNull();
      expect(localStorage.getItem(SystemConstant.CURRENT_INFO_SKEY)).toBeNull();
    });

    it('chuyển trang tới đường dẫn đích khi đang ở trang khác', () => {
      const assign = vi.fn();
      vi.stubGlobal('location', { pathname: '/mng/dashboard', assign });
      const { service } = setup();
      service.doLogout('/auth/login');
      expect(assign).toHaveBeenCalledWith('../auth/login');
    });

    it('không chuyển trang khi đã ở đúng đường dẫn đích, trừ khi bắt buộc (ca biên)', () => {
      const assign = vi.fn();
      vi.stubGlobal('location', { pathname: '/auth/login', assign });
      const { service } = setup();
      service.doLogout('/auth/login');
      expect(assign).not.toHaveBeenCalled();
      service.doLogout('/auth/login', true);
      expect(assign).toHaveBeenCalledTimes(1);
    });
  });

  describe('gọi API', () => {
    it('doLoginForm gửi POST tới rest/login với thông tin đăng nhập', () => {
      const { service, http } = setup();
      let received: IAuthData | undefined;
      service.doLoginForm({ email: 'thu.nghiem@example.org', password: 'mat-khau-gia' })
        .subscribe(data => { received = data; });
      const req = http.expectOne(LOGIN_API);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'thu.nghiem@example.org', password: 'mat-khau-gia' });
      req.flush(AUTH_DATA);
      expect(received).toEqual(AUTH_DATA);
      http.verify();
    });

    it('doLoginGoogle gửi accessToken trong header, không đặt token trên URL', () => {
      const { service, http } = setup();
      service.doLoginGoogle('google-token-gia').subscribe();
      const req = http.expectOne(`${LOGIN_API}/google`);
      expect(req.request.headers.get('accessToken')).toBe('google-token-gia');
      expect(req.request.urlWithParams).not.toContain('google-token-gia');
      req.flush(AUTH_DATA);
      http.verify();
    });

    it('doRegisterForm chỉ gọi API cho vai trò sinh viên; vai trò khác nhận thông báo không hỗ trợ', () => {
      const { service, http } = setup();
      service.doRegisterForm(SystemConstant.ROLE.STUDENT, { email: 'a@example.org' }).subscribe();
      const req = http.expectOne(`${LOGIN_API}/register`);
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'ok' });

      let message = '';
      service.doRegisterForm('ROLE_KHAC', {}).subscribe(res => { message = res.message; });
      expect(message).toBe('Tài khoản không được hỗ trợ!');
      http.expectNone(`${LOGIN_API}/register`);
      http.verify();
    });

    it('doResetPasswordRequest gọi forgot-password; vai trò khác không gọi mạng', () => {
      const { service, http } = setup();
      service.doResetPasswordRequest(SystemConstant.ROLE.STUDENT, { email: 'a@example.org' }).subscribe();
      http.expectOne(`${LOGIN_API}/forgot-password`).flush({ message: 'ok' });

      let message = '';
      service.doResetPasswordRequest('ROLE_KHAC', {}).subscribe(res => { message = res.message; });
      expect(message).toBe('Tài khoản không được hỗ trợ!');
      http.verify();
    });

    it('doResetPasswordUpdate gửi mã đặt lại trong header thiSinhId, không trên URL', () => {
      const { service, http } = setup();
      service.doResetPasswordUpdate(SystemConstant.ROLE.STUDENT, { password: 'x' }, 'ma-dat-lai-gia').subscribe();
      const req = http.expectOne(`${LOGIN_API}/reset-password`);
      expect(req.request.headers.get('thiSinhId')).toBe('ma-dat-lai-gia');
      expect(req.request.urlWithParams).not.toContain('ma-dat-lai-gia');
      req.flush({ message: 'ok' });

      let message = '';
      service.doResetPasswordUpdate('ROLE_KHAC', {}, 't').subscribe(res => { message = res.message; });
      expect(message).toBe('Tài khoản không được hỗ trợ!');
      http.verify();
    });
  });
});
