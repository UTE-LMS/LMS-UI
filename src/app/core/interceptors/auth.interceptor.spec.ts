import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@services/auth/auth.service';
import { HandlerErrorService } from '@services/common/handler-error.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { authInterceptor } from './auth.interceptor';

interface Options {
  loggedIn: boolean;
  /** Có token nhưng không có dữ liệu người dùng. */
  missingUserData?: boolean;
}

function setup(options: Options) {
  const auth = {
    getAuthData: vi.fn(() => (options.loggedIn && !options.missingUserData ? { roles: [] } : null)),
    getToken: vi.fn(() => (options.loggedIn ? 'jwt-gia' : '')),
  };
  const handler = { handleError: vi.fn() };
  const spinner = { show: vi.fn(), hide: vi.fn() };
  const toastr = { warning: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: auth },
      { provide: HandlerErrorService, useValue: handler },
      { provide: NgxSpinnerService, useValue: spinner },
      { provide: ToastrService, useValue: toastr },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
    handler, spinner, toastr,
  };
}

describe('US-01/AC-6 và US-03/AC-2: authInterceptor gắn thông tin xác thực cho mọi yêu cầu', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('đã đăng nhập: gắn Authorization Bearer', () => {
    const { http, controller } = setup({ loggedIn: true });
    http.get('rest/demo').subscribe();
    const req = controller.expectOne('rest/demo');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-gia');
    req.flush({});
    controller.verify();
  });

  it('chưa đăng nhập: không gắn Authorization (ca âm)', () => {
    const { http, controller } = setup({ loggedIn: false });
    http.get('rest/demo').subscribe();
    const req = controller.expectOne('rest/demo');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('có token nhưng thiếu dữ liệu người dùng: không gắn Authorization', () => {
    const { http, controller } = setup({ loggedIn: true, missingUserData: true });
    http.get('rest/demo').subscribe();
    const req = controller.expectOne('rest/demo');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('Accept-Language là "vn" khi giao diện tiếng Việt, "en" trong các trường hợp còn lại', () => {
    const { http, controller } = setup({ loggedIn: false });
    localStorage.setItem('language', 'vi');
    http.get('rest/a').subscribe();
    expect(controller.expectOne('rest/a').request.headers.get('Accept-Language')).toBe('vn');
    localStorage.removeItem('language');
    http.get('rest/b').subscribe();
    expect(controller.expectOne('rest/b').request.headers.get('Accept-Language')).toBe('en');
  });

  it('địa chỉ API công khai của trường không nhận token (ca biên)', () => {
    const { http, controller } = setup({ loggedIn: true });
    http.get('https://api.hcmute.edu.vn:8443/public/x').subscribe();
    const req = controller.expectOne('https://api.hcmute.edu.vn:8443/public/x');
    expect(req.request.headers.has('Authorization')).toBe(false);
  });

  it('yêu cầu GET tới googleapis không gắn Accept-Language', () => {
    const { http, controller } = setup({ loggedIn: false });
    http.get('https://people.googleapis.com/v1/people/me').subscribe();
    const req = controller.expectOne('https://people.googleapis.com/v1/people/me');
    expect(req.request.headers.has('Accept-Language')).toBe(false);
  });

  it('bật spinner khi gửi và tắt khi hoàn thành', () => {
    const { http, controller, spinner } = setup({ loggedIn: false });
    http.get('rest/demo').subscribe();
    expect(spinner.show).toHaveBeenCalledTimes(1);
    expect(spinner.hide).not.toHaveBeenCalled();
    controller.expectOne('rest/demo').flush({});
    expect(spinner.hide).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 500])('lỗi %i: chuyển cho HandlerErrorService, tắt spinner và vẫn ném lỗi cho nơi gọi', (status) => {
    const { http, controller, handler, spinner } = setup({ loggedIn: true });
    let failure: unknown;
    http.get('rest/demo').subscribe({ error: (err: unknown) => { failure = err; } });
    controller.expectOne('rest/demo').flush({ message: 'x' }, { status, statusText: 'err' });
    expect(handler.handleError).toHaveBeenCalledTimes(1);
    expect(failure).toMatchObject({ status });
    expect(spinner.hide).toHaveBeenCalledTimes(1);
  });

  it('cảnh báo khi mở trong WebView của ứng dụng khác ngoài trang chủ', () => {
    const { http, controller, toastr } = setup({ loggedIn: false });
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 FBAV/400.0');
    window.history.pushState({}, '', '/mng/dashboard');
    http.get('rest/demo').subscribe();
    controller.expectOne('rest/demo').flush({});
    expect(toastr.warning).toHaveBeenCalledTimes(1);
  });

  it('không cảnh báo WebView ở trang chủ hoặc với trình duyệt thường (ca biên)', () => {
    const { http, controller, toastr } = setup({ loggedIn: false });
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 FBAV/400.0');
    http.get('rest/a').subscribe();
    controller.expectOne('rest/a').flush({});
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Chrome/140');
    window.history.pushState({}, '', '/mng/dashboard');
    http.get('rest/b').subscribe();
    controller.expectOne('rest/b').flush({});
    expect(toastr.warning).not.toHaveBeenCalled();
  });
});
