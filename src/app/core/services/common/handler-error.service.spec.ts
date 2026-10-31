import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { AuthService } from '@services/auth/auth.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { BugsReportService } from './bugs-report.service';
import { HandlerErrorService } from './handler-error.service';

const apiError = (status: number, message: string, headers?: HttpHeaders): HttpErrorResponse => new HttpErrorResponse({
  status,
  statusText: 'x',
  headers,
  url: 'http://localhost:8080/api/v1/users',
  error: { timestamp: '2026-10-27T05:00:00Z', status, code: 'X', message, path: '/api/v1/users' },
});

describe('HandlerErrorService - bảng ánh xạ lỗi API-CONTRACT.md §3', () => {
  let service: HandlerErrorService;
  const alert = { error: vi.fn(), warning: vi.fn(), success: vi.fn() };
  const router = { url: '/mng/users', navigate: vi.fn(), createUrlTree: vi.fn() };
  const authSvc = { clearSession: vi.fn(), getAuthData: vi.fn(), getToken: vi.fn() };

  /** Gọi handleError và bỏ qua lỗi ném lại (observable throwError, không ai subscribe). */
  const handle = (err: HttpErrorResponse, inline = false): void => {
    service.handleError(err, { inline }).subscribe({ error: () => undefined });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: ToastrService, useValue: alert },
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authSvc },
        { provide: NgxSpinnerService, useValue: { hide: vi.fn(), show: vi.fn() } },
        { provide: BugsReportService, useValue: { submitBugsReport: vi.fn() } },
      ],
    });
    service = TestBed.inject(HandlerErrorService);
  });

  it('401 ở API thường: xóa phiên, báo hết hạn và về đăng nhập kèm returnUrl', () => {
    handle(apiError(401, 'Hết hạn'));
    expect(authSvc.clearSession).toHaveBeenCalledOnce();
    expect(alert.warning).toHaveBeenCalledWith('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
    expect(router.navigate).toHaveBeenCalledWith([UrlConstant.ROUTE.AUTH.LOGIN], { queryParams: { returnUrl: '/mng/users' } });
  });

  it('401 của đăng nhập (inline): KHÔNG xóa phiên, KHÔNG chuyển hướng, KHÔNG toast', () => {
    handle(apiError(401, 'Tên đăng nhập hoặc mật khẩu không chính xác'), true);
    expect(authSvc.clearSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(alert.warning).not.toHaveBeenCalled();
    expect(alert.error).not.toHaveBeenCalled();
  });

  it('401 khi đang ở trang đăng nhập không chuyển hướng lặp', () => {
    router.url = '/auth/login?returnUrl=%2Fmng';
    handle(apiError(401, 'x'));
    expect(router.navigate).not.toHaveBeenCalled();
    router.url = '/mng/users';
  });

  it('403: báo không đủ quyền, KHÔNG đăng xuất và KHÔNG chuyển về đăng nhập (kể cả inline)', () => {
    handle(apiError(403, 'Forbidden'));
    handle(apiError(403, 'Forbidden'), true);
    expect(alert.error).toHaveBeenCalledTimes(2);
    expect(alert.error).toHaveBeenCalledWith('Bạn không có quyền truy cập chức năng này.');
    expect(authSvc.clearSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('400/409/422 inline: để form tự hiển thị, không toast', () => {
    handle(apiError(400, 'Dữ liệu yêu cầu không hợp lệ'), true);
    handle(apiError(409, 'Trùng'), true);
    handle(apiError(422, 'Quy tắc'), true);
    handle(apiError(404, 'Không có'), true);
    expect(alert.warning).not.toHaveBeenCalled();
    expect(alert.error).not.toHaveBeenCalled();
  });

  it('409 không inline: cảnh báo bằng thông điệp của backend', () => {
    handle(apiError(409, 'Tên đăng nhập đã tồn tại'));
    expect(alert.warning).toHaveBeenCalledWith('Tên đăng nhập đã tồn tại');
  });

  it('422 không inline: toast lỗi với thông điệp quy tắc nghiệp vụ', () => {
    handle(apiError(422, 'Không thể khóa quản trị viên cuối cùng'));
    expect(alert.error).toHaveBeenCalledWith('Không thể khóa quản trị viên cuối cùng');
  });

  it('404 không inline: cảnh báo không tìm thấy dữ liệu', () => {
    handle(apiError(404, 'x'));
    expect(alert.warning).toHaveBeenCalledWith('Không tìm thấy dữ liệu yêu cầu.');
  });

  it('500: toast lỗi nội bộ kèm mã truy vết X-Correlation-Id, kể cả khi inline', () => {
    handle(apiError(500, 'Lỗi', new HttpHeaders({ 'X-Correlation-Id': 'abc-123' })), true);
    expect(alert.error).toHaveBeenCalledWith(
      'Mã truy vết: abc-123',
      'Đã xảy ra lỗi nội bộ hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
    );
  });

  it('mất mạng (status 0): thông báo và KHÔNG đăng xuất người dùng', () => {
    handle(new HttpErrorResponse({ status: 0, url: 'http://localhost:8080/api/v1/users' }));
    expect(alert.error).toHaveBeenCalledWith('Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.');
    expect(authSvc.clearSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
