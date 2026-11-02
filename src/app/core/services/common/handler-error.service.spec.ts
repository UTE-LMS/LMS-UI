import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env';
import { AuthService } from '@services/auth/auth.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { BugsReportService } from './bugs-report.service';
import { HandlerErrorService } from './handler-error.service';

const MSG_NO_PERMISSION = 'Tài khoản không có quyền truy cập';
const MSG_GENERIC = 'Có lỗi xảy ra, vui lòng thử lại!';

function setup() {
  const auth = { getAuthData: vi.fn(() => null), getToken: vi.fn(() => ''), doLogout: vi.fn() };
  const toastr = { error: vi.fn() };
  const spinner = { hide: vi.fn() };
  const bugs = { submitBugsReport: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: ToastrService, useValue: toastr },
      { provide: NgxSpinnerService, useValue: spinner },
      { provide: BugsReportService, useValue: bugs },
    ],
  });
  return { service: TestBed.inject(HandlerErrorService), auth, toastr, spinner, bugs };
}

function httpError(status: number, error: unknown, url = 'rest/demo'): HttpErrorResponse {
  return new HttpErrorResponse({ status, error, url });
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error;
  }
}

describe('US-40/AC-4: HandlerErrorService chuẩn hóa lỗi HTTP thành thông báo cho người dùng', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([401, 403])('mã %i: báo "không có quyền" và tắt spinner (ca âm/quyền)', async (status) => {
    const { service, toastr, spinner } = setup();
    const error = await rejection(firstValueFrom(service.handleError(httpError(status, { message: 'chi tiet noi bo' }))));
    expect(error).toBeInstanceOf(Error);
    expect(toastr.error).toHaveBeenCalledWith(MSG_NO_PERMISSION);
    expect(toastr.error).not.toHaveBeenCalledWith('chi tiet noi bo');
    expect(spinner.hide).toHaveBeenCalledTimes(1);
  });

  it('401/403 ở môi trường phát triển không tự đăng xuất (isDevMode)', async () => {
    const { service, auth } = setup();
    await rejection(firstValueFrom(service.handleError(httpError(401, null))));
    expect(auth.doLogout).not.toHaveBeenCalled();
  });

  it('lỗi 500 hiển thị thông điệp của máy chủ nằm ở error.message', async () => {
    const { service, toastr } = setup();
    await rejection(firstValueFrom(service.handleError(httpError(500, { message: 'Máy chủ đang bận' }))));
    expect(toastr.error).toHaveBeenCalledWith('Máy chủ đang bận');
  });

  it('lỗi của dịch vụ tệp nằm ở error.error.message được ưu tiên', async () => {
    const { service, toastr } = setup();
    await rejection(firstValueFrom(service.handleError(httpError(400, { error: { message: 'Tệp quá lớn' } }))));
    expect(toastr.error).toHaveBeenCalledWith('Tệp quá lớn');
  });

  it('phản hồi lỗi không có message: dùng thông báo chung', async () => {
    const { service, toastr } = setup();
    await rejection(firstValueFrom(service.handleError(httpError(500, {}))));
    expect(toastr.error).toHaveBeenCalledWith(MSG_GENERIC);
  });

  it('phản hồi lỗi rỗng (null) không làm văng ngoại lệ: dùng thông báo chung', async () => {
    const { service, toastr } = setup();
    await rejection(firstValueFrom(service.handleError(httpError(502, null))));
    expect(toastr.error).toHaveBeenCalledWith(MSG_GENERIC);
  });

  it('lỗi dạng Blob (tải tệp thất bại): đọc JSON trong blob rồi hiển thị message', async () => {
    const { service, toastr } = setup();
    const blob = { text: () => Promise.resolve(JSON.stringify({ message: 'Không có tệp' })) };
    Object.setPrototypeOf(blob, Blob.prototype);
    await rejection(firstValueFrom(service.handleError(httpError(404, blob))));
    await vi.waitFor(() => expect(toastr.error).toHaveBeenCalledWith('Không có tệp'));
  });

  it('mất kết nối (status 0): báo lỗi chung', async () => {
    const { service, toastr } = setup();
    await rejection(firstValueFrom(service.handleError(httpError(0, null))));
    expect(toastr.error).toHaveBeenCalledWith(MSG_GENERIC);
  });

  it('lỗi từ chính API báo lỗi: không báo thêm, tránh vòng lặp vô tận (ca biên)', async () => {
    const { service, toastr, spinner, bugs } = setup();
    const error = await rejection(firstValueFrom(
      service.handleError(httpError(500, 'x', 'https://script.google.com/macros/s/abc/exec')),
    ));
    expect(error).toBeInstanceOf(Error);
    expect(toastr.error).not.toHaveBeenCalled();
    expect(bugs.submitBugsReport).not.toHaveBeenCalled();
    expect(spinner.hide).toHaveBeenCalledTimes(1);
    expect(environment.bugsReportUrl).toContain('script.google.com');
  });

  it('submitBugsReport gửi thông tin trình duyệt và nuốt lỗi gửi báo cáo', () => {
    const { service, bugs } = setup();
    bugs.submitBugsReport.mockReturnValue({
      subscribe: (observer: { error: () => void; }) => observer.error(),
    });
    expect(() => service.submitBugsReport('[500] x')).not.toThrow();
    const dto = bugs.submitBugsReport.mock.calls[0][0] as { errorInfo: string; errorDomain: string; };
    expect(dto.errorInfo).toBe('[500] x');
    expect(dto.errorDomain).toBe(window.location.hostname);
  });

  it('handleErrorForkJoin trả về mảng rỗng để forkJoin không bị hủy', async () => {
    const { service } = setup();
    expect(await firstValueFrom(service.handleErrorForkJoin())).toEqual([]);
  });
});
