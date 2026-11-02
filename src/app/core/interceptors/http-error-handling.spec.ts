import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HTTP_POLICY } from '@constants/error-message.constant';
import { UrlConstant } from '@constants/url.constant';
import { AuthService } from '@services/auth/auth.service';
import { BugsReportService } from '@services/common/bugs-report.service';
import { toUserError } from '@services/common/api-error.util';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { authInterceptor } from './auth.interceptor';
import { AUTO_RETRY, INLINE_ERRORS, REQUEST_TIMEOUT_MS } from './http-context.token';
import { requestTimeoutInterceptor } from './request-timeout.interceptor';
import { safeRetryInterceptor } from './safe-retry.interceptor';

const API = UrlConstant.API.USERS;

/** Thân lỗi chuẩn (ví dụ minh họa) theo API-CONTRACT.md §2. */
const body = (status: number, code: string, message: string, extra: object = {}) => ({
  timestamp: '2026-10-27T05:00:00Z', status, code, message, path: '/api/v1/users', ...extra,
});

describe('Xử lý lỗi HTTP toàn ứng dụng (US-40 phía UI): auth + thử lại + hết thời gian + HandlerErrorService', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  const alert = { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() };
  const router = { url: '/mng/users', navigate: vi.fn(() => Promise.resolve(true)) };
  const authSvc = { clearSession: vi.fn(), getAuthData: vi.fn(() => null), getToken: vi.fn(() => '') };
  const spinner = { show: vi.fn(), hide: vi.fn() };
  const bugsReport = { submitBugsReport: vi.fn() };

  /** Gọi và gom kết quả; lỗi được trả về qua `errors` để kiểm tra HttpErrorResponse mà màn hình nhận. */
  const call = (method: string, url: string, options: { context?: HttpContext; body?: unknown; } = {}) => {
    const errors: unknown[] = [];
    const results: unknown[] = [];
    http.request(method, url, { body: options.body, context: options.context })
      .subscribe({ next: value => results.push(value), error: (err: unknown) => errors.push(err) });
    return { errors, results };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, safeRetryInterceptor, requestTimeoutInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastrService, useValue: alert },
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authSvc },
        { provide: NgxSpinnerService, useValue: spinner },
        { provide: BugsReportService, useValue: bugsReport },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    ctrl.verify();
  });

  describe('từng mã lỗi', () => {
    it('US-40/AC-1: 400 có fieldErrors - màn hình nhận lại lỗi chuẩn, toast cảnh báo theo message', () => {
      const result = call('POST', API, { body: {} });
      ctrl.expectOne(API).flush(
        body(400, 'VALIDATION_ERROR', 'Dữ liệu yêu cầu không hợp lệ', { fieldErrors: [{ field: 'username', message: 'Quá ngắn' }] }),
        { status: 400, statusText: 'Bad Request' },
      );
      expect(alert.warning).toHaveBeenCalledWith('Dữ liệu yêu cầu không hợp lệ');
      const user = toUserError(result.errors[0]);
      expect(user.fieldErrors).toEqual([{ field: 'username', message: 'Quá ngắn', rejectedValue: undefined }]);
    });

    it('US-40/AC-1: 400 của màn hình tự hiển thị (INLINE_ERRORS) không toast để form giữ nguyên dữ liệu', () => {
      call('POST', API, { context: new HttpContext().set(INLINE_ERRORS, true) });
      ctrl.expectOne(API).flush(body(400, 'VALIDATION_ERROR', 'x'), { status: 400, statusText: 'Bad Request' });
      expect(alert.warning).not.toHaveBeenCalled();
      expect(alert.error).not.toHaveBeenCalled();
    });

    it('401: xóa phiên, báo hết hạn, về đăng nhập đúng một lần dù nhiều yêu cầu song song cùng 401', () => {
      call('GET', `${API}/1`);
      call('GET', `${API}/2`);
      call('GET', `${API}/3`);
      for (const request of ctrl.match(r => r.url.startsWith(`${API}/`))) {
        request.flush(body(401, 'UNAUTHORIZED', 'Token hết hạn'), { status: 401, statusText: 'Unauthorized' });
      }
      expect(authSvc.clearSession).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith([UrlConstant.ROUTE.AUTH.LOGIN], { queryParams: { returnUrl: '/mng/users' } });
      expect(alert.warning).toHaveBeenCalledTimes(1);
    });

    it('401 của POST đăng nhập: KHÔNG xóa phiên, KHÔNG chuyển hướng, KHÔNG toast, kể cả khi quên INLINE_ERRORS', () => {
      const result = call('POST', UrlConstant.API.AUTH_LOGIN, { body: { username: 'x', password: 'y' } });
      ctrl.expectOne(UrlConstant.API.AUTH_LOGIN).flush(
        body(401, 'UNAUTHORIZED', 'Tên đăng nhập hoặc mật khẩu không chính xác'),
        { status: 401, statusText: 'Unauthorized' },
      );
      expect(authSvc.clearSession).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(alert.warning).not.toHaveBeenCalled();
      expect(toUserError(result.errors[0]).serverMessage).toBe('Tên đăng nhập hoặc mật khẩu không chính xác');
      ctrl.expectNone(UrlConstant.API.AUTH_LOGIN); // không có lần gọi lại endpoint đăng nhập nào
    });

    it('403: báo không đủ quyền, không đăng xuất, không chuyển về đăng nhập', () => {
      call('GET', `${API}/1`);
      ctrl.expectOne(`${API}/1`).flush(body(403, 'FORBIDDEN', 'Access Denied'), { status: 403, statusText: 'Forbidden' });
      expect(alert.error).toHaveBeenCalledWith('Bạn không có quyền truy cập chức năng này.');
      expect(authSvc.clearSession).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('404: cảnh báo không tìm thấy dữ liệu', () => {
      call('GET', `${API}/1`);
      ctrl.expectOne(`${API}/1`).flush(body(404, 'NOT_FOUND', 'x'), { status: 404, statusText: 'Not Found' });
      expect(alert.warning).toHaveBeenCalledWith('Không tìm thấy dữ liệu yêu cầu.');
    });

    it('US-40/AC-3: 409 báo xung đột kèm gợi ý tải lại', () => {
      call('PUT', `${API}/1`, { body: {} });
      ctrl.expectOne(`${API}/1`).flush(body(409, 'CONFLICT', 'Dữ liệu đã bị thay đổi'), { status: 409, statusText: 'Conflict' });
      expect(alert.warning).toHaveBeenCalledOnce();
      const text = String(alert.warning.mock.calls[0][0]);
      expect(text).toContain('Dữ liệu đã bị thay đổi');
      expect(text).toContain('tải lại');
    });

    it('US-40/AC-2: 422 nêu quy tắc nghiệp vụ bằng toast lỗi', () => {
      call('PUT', `${API}/1/status`, { body: {} });
      ctrl.expectOne(`${API}/1/status`).flush(
        body(422, 'BUSINESS_RULE_VIOLATION', 'Không thể khóa quản trị viên cuối cùng'),
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      expect(alert.error).toHaveBeenCalledWith('Không thể khóa quản trị viên cuối cùng');
    });

    it('US-40/AC-4: 500 hiển thị mã truy vết, không lộ stack trace', () => {
      call('POST', API, { body: {} });
      const leak = 'java.lang.IllegalStateException\n\tat com.example.UserService.create(UserService.java:88)';
      ctrl.expectOne(API).flush(body(500, 'INTERNAL_ERROR', leak), {
        status: 500,
        statusText: 'Server Error',
        headers: { 'X-Correlation-Id': 'abc-123' },
      });
      expect(alert.error).toHaveBeenCalledWith(
        'Mã truy vết: abc-123',
        'Đã xảy ra lỗi nội bộ hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
      );
      expect(JSON.stringify(alert.error.mock.calls)).not.toContain('UserService');
    });

    it('500 không có header truy vết: vẫn thông báo, không in "undefined"', () => {
      call('POST', API, { body: {} });
      ctrl.expectOne(API).flush(body(500, 'INTERNAL_ERROR', 'x'), { status: 500, statusText: 'Server Error' });
      expect(alert.error).toHaveBeenCalledWith('', expect.stringContaining('lỗi nội bộ'));
    });

    it('lỗi không có body (cổng trả 502 rỗng) vẫn có thông báo chung, không ném lỗi', () => {
      call('POST', API, { body: {} });
      ctrl.expectOne(API).flush(null, { status: 502, statusText: 'Bad Gateway' });
      expect(alert.error).toHaveBeenCalledOnce();
    });

    it('body lỗi là HTML (không đúng chuẩn): thông báo chung, không hiển thị HTML', () => {
      call('POST', API, { body: {} });
      ctrl.expectOne(API).flush('<html><body>Gateway error at proxy-1</body></html>', { status: 500, statusText: 'Server Error' });
      expect(JSON.stringify(alert.error.mock.calls)).not.toContain('<html>');
    });

    it('mất mạng khi ghi (POST): thông báo, KHÔNG đăng xuất và KHÔNG tự thử lại', () => {
      call('POST', API, { body: {} });
      ctrl.expectOne(API).error(new ProgressEvent('error'), { status: 0 });
      expect(alert.error).toHaveBeenCalledWith('Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.');
      expect(authSvc.clearSession).not.toHaveBeenCalled();
      ctrl.expectNone(API);
    });

    it('spinner luôn được tắt sau lỗi', () => {
      call('GET', `${API}/1`);
      ctrl.expectOne(`${API}/1`).flush(body(404, 'NOT_FOUND', 'x'), { status: 404, statusText: 'Not Found' });
      expect(spinner.show).toHaveBeenCalled();
      expect(spinner.hide).toHaveBeenCalled();
    });
  });

  describe('thử lại có kiểm soát - chỉ thao tác an toàn/idempotent', () => {
    beforeEach(() => vi.useFakeTimers());

    it('GET gặp 503: tự thử lại và thành công, người dùng không thấy lỗi', async () => {
      const result = call('GET', API);
      ctrl.expectOne(API).flush(null, { status: 503, statusText: 'Service Unavailable' });
      await vi.advanceTimersByTimeAsync(HTTP_POLICY.RETRY_BASE_DELAY_MS);
      ctrl.expectOne(API).flush({ ok: true });
      expect(result.results).toEqual([{ ok: true }]);
      expect(alert.error).not.toHaveBeenCalled();
    });

    it('GET mất kết nối liên tục: thử tối đa MAX_AUTO_RETRIES lần (lùi dần) rồi mới báo lỗi một lần', async () => {
      const result = call('GET', API);
      ctrl.expectOne(API).error(new ProgressEvent('error'), { status: 0 }); // lần 1
      await vi.advanceTimersByTimeAsync(500);
      ctrl.expectOne(API).error(new ProgressEvent('error'), { status: 0 }); // thử lại 1
      await vi.advanceTimersByTimeAsync(1000);
      ctrl.expectOne(API).error(new ProgressEvent('error'), { status: 0 }); // thử lại 2
      expect(alert.error).toHaveBeenCalledTimes(1);
      expect(result.errors).toHaveLength(1);
      expect(HTTP_POLICY.MAX_AUTO_RETRIES).toBe(2);
      ctrl.expectNone(API); // không có lần thứ 4
    });

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('%s gặp 503: KHÔNG tự thử lại (có thể ghi hai lần)', async method => {
      call(method, API, { body: {} });
      ctrl.expectOne(API).flush(null, { status: 503, statusText: 'Service Unavailable' });
      await vi.advanceTimersByTimeAsync(10_000);
      ctrl.expectNone(API);
      expect(alert.error).toHaveBeenCalledTimes(1);
    });

    it.each([400, 401, 403, 404, 409, 422, 500])('GET gặp %i: không thử lại vì không phải lỗi tạm thời', async status => {
      call('GET', API, { context: new HttpContext().set(INLINE_ERRORS, true) });
      ctrl.expectOne(API).flush(body(status, 'X', 'x'), { status, statusText: 'x' });
      await vi.advanceTimersByTimeAsync(10_000);
      ctrl.expectNone(API);
    });

    it('GET khi trình duyệt ngoại tuyến: không thử lại, báo lỗi ngay', async () => {
      const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      try {
        call('GET', API);
        ctrl.expectOne(API).error(new ProgressEvent('error'), { status: 0 });
        await vi.advanceTimersByTimeAsync(10_000);
        ctrl.expectNone(API);
        expect(alert.error).toHaveBeenCalledTimes(1);
      } finally {
        spy.mockRestore();
      }
    });

    it('AUTO_RETRY=false tắt thử lại cho một yêu cầu GET', async () => {
      call('GET', API, { context: new HttpContext().set(AUTO_RETRY, false) });
      ctrl.expectOne(API).flush(null, { status: 503, statusText: 'Service Unavailable' });
      await vi.advanceTimersByTimeAsync(10_000);
      ctrl.expectNone(API);
    });
  });

  describe('hết thời gian', () => {
    beforeEach(() => vi.useFakeTimers());

    it('GET quá hạn: hủy yêu cầu, báo hết thời gian, không tự thử lại', async () => {
      const result = call('GET', API);
      const request = ctrl.expectOne(API);
      await vi.advanceTimersByTimeAsync(HTTP_POLICY.DEFAULT_TIMEOUT_MS + 1);
      expect(request.cancelled).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBeInstanceOf(HttpErrorResponse);
      expect(toUserError(result.errors[0]).kind).toBe('TIMEOUT');
      expect(alert.error).toHaveBeenCalledWith(expect.stringContaining('phản hồi quá lâu'));
      ctrl.expectNone(API);
    });

    it('POST quá hạn: cảnh báo thao tác có thể đã được thực hiện', async () => {
      call('POST', API, { body: {} });
      ctrl.expectOne(API);
      await vi.advanceTimersByTimeAsync(HTTP_POLICY.DEFAULT_TIMEOUT_MS + 1);
      expect(String(alert.error.mock.calls[0][0])).toContain('có thể đã được thực hiện');
    });

    it('REQUEST_TIMEOUT_MS=0 tắt giới hạn (tải tệp lớn)', async () => {
      const result = call('POST', API, { body: {}, context: new HttpContext().set(REQUEST_TIMEOUT_MS, 0) });
      const request = ctrl.expectOne(API);
      await vi.advanceTimersByTimeAsync(10 * HTTP_POLICY.DEFAULT_TIMEOUT_MS);
      expect(request.cancelled).toBe(false);
      request.flush({ ok: true });
      expect(result.results).toEqual([{ ok: true }]);
    });

    it('phản hồi đến kịp thì không báo lỗi', async () => {
      const result = call('GET', API);
      await vi.advanceTimersByTimeAsync(HTTP_POLICY.DEFAULT_TIMEOUT_MS - 1000);
      ctrl.expectOne(API).flush({ ok: true });
      await vi.advanceTimersByTimeAsync(2 * HTTP_POLICY.DEFAULT_TIMEOUT_MS);
      expect(result.results).toEqual([{ ok: true }]);
      expect(alert.error).not.toHaveBeenCalled();
    });
  });
});
