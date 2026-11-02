import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IUserError } from '@models/common/user-error.model';
import { ErrorStateComponent } from './error-state.component';

const makeError = (overrides: Partial<IUserError>): IUserError => ({
  kind: 'SERVER',
  status: 500,
  code: null,
  title: 'Lỗi hệ thống',
  message: 'Đã xảy ra lỗi nội bộ hệ thống.',
  serverMessage: null,
  hint: null,
  fieldErrors: [],
  correlationId: null,
  retryable: true,
  suggestReload: false,
  ...overrides,
});

describe('ErrorStateComponent - trạng thái lỗi dùng chung (US-40)', () => {
  let fixture: ComponentFixture<ErrorStateComponent>;
  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const buttons = (): string[] => Array.from(host().querySelectorAll('button, a')).map(el => (el.textContent ?? '').trim());

  const render = (error: IUserError, inputs: Record<string, unknown> = {}): void => {
    fixture = TestBed.createComponent(ErrorStateComponent);
    fixture.componentRef.setInput('error', error);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [ErrorStateComponent], providers: [provideRouter([])] }));

  it('lỗi 500: có role=alert, tiêu đề, thông báo và nút Thử lại phát sự kiện retry', () => {
    render(makeError({}));
    expect(host().querySelector('[role="alert"]')).not.toBeNull();
    expect(host().textContent).toContain('Lỗi hệ thống');
    expect(host().textContent).toContain('Đã xảy ra lỗi nội bộ hệ thống.');
    expect(buttons()).toEqual(['Thử lại']);
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => retried++);
    host().querySelector<HTMLButtonElement>('button')?.click();
    expect(retried).toBe(1);
  });

  it('hiển thị mã truy vết khi API trả X-Correlation-Id', () => {
    render(makeError({ correlationId: '3f2b8c1e-aaaa-bbbb-cccc-1234567890ab' }));
    expect(host().textContent).toContain('Mã truy vết: 3f2b8c1e-aaaa-bbbb-cccc-1234567890ab');
  });

  it('không có mã truy vết thì không hiển thị dòng mã truy vết', () => {
    render(makeError({ correlationId: null }));
    expect(host().textContent).not.toContain('Mã truy vết');
  });

  it('mất mạng và hết thời gian đều cho Thử lại', () => {
    render(makeError({ kind: 'NETWORK', status: 0, title: 'Không kết nối được máy chủ', message: 'Kiểm tra mạng.' }));
    expect(buttons()).toContain('Thử lại');
    render(makeError({ kind: 'TIMEOUT', status: 0, title: 'Máy chủ phản hồi quá lâu', message: 'Thử lại.' }));
    expect(buttons()).toContain('Thử lại');
  });

  it('403 không đủ quyền: KHÔNG có nút Thử lại (thử lại cũng bị từ chối)', () => {
    render(makeError({ kind: 'FORBIDDEN', status: 403, retryable: false, title: 'Không đủ quyền', message: 'Bạn không có quyền.' }));
    expect(buttons()).toEqual([]);
    expect(host().querySelector('[data-kind="FORBIDDEN"]')).not.toBeNull();
  });

  it('allowRetry=false ẩn nút Thử lại dù lỗi tạm thời', () => {
    render(makeError({}), { allowRetry: false });
    expect(buttons()).toEqual([]);
  });

  it('đang thử lại: nút bị khóa để không bấm dồn', () => {
    render(makeError({}), { retrying: true });
    expect(host().querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
  });

  it('409: hiện gợi ý và nút Tải lại dữ liệu, không có Thử lại', () => {
    render(makeError({
      kind: 'CONFLICT', status: 409, retryable: false, suggestReload: true,
      title: 'Dữ liệu bị xung đột', message: 'Dữ liệu đã bị thay đổi.', hint: 'Hãy tải lại để xem bản mới nhất.',
    }));
    expect(buttons()).toEqual(['Tải lại dữ liệu']);
    expect(host().textContent).toContain('Hãy tải lại để xem bản mới nhất.');
    let reloaded = 0;
    fixture.componentInstance.reload.subscribe(() => reloaded++);
    host().querySelector<HTMLButtonElement>('button')?.click();
    expect(reloaded).toBe(1);
  });

  it('404 với backLink: có liên kết quay lại danh sách', () => {
    render(makeError({ kind: 'NOT_FOUND', status: 404, retryable: false, title: 'Không tìm thấy dữ liệu', message: 'Không tìm thấy dữ liệu yêu cầu.' }), {
      backLink: '/mng/users',
    });
    const link = host().querySelector('a');
    expect(link?.textContent?.trim()).toBe('Quay lại trang danh sách');
    expect(link?.getAttribute('href')).toBe('/mng/users');
  });

  it('thông báo rất dài vẫn được hiển thị đầy đủ và cho phép ngắt dòng', () => {
    const long = 'Quy tắc '.repeat(200);
    render(makeError({ message: long }));
    const paragraph = host().querySelector('p');
    expect(paragraph?.textContent?.trim()).toBe(long.trim());
    expect(paragraph?.className).toContain('wrap-break-word');
  });

  it('nội dung được escape, không chèn HTML từ thông báo', () => {
    render(makeError({ message: '<img src=x onerror=alert(1)>' }));
    expect(host().querySelector('img')).toBeNull();
    expect(host().textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
