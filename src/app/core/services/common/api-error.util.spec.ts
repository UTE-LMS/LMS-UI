import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { CONFLICT_RELOAD_HINT, ERROR_MESSAGE, MUTATION_UNCERTAIN_HINT } from '@constants/error-message.constant';
import { RequestTimeoutError } from '@interceptors/request-timeout.error';
import { correlationIdOf, httpStatusOf, isSafeMessage, toApiError, toUserError } from './api-error.util';

const URL = 'http://localhost:8080/api/v1/users';

/** Lỗi HTTP có body theo chuẩn API-CONTRACT.md §2 (nội dung là ví dụ minh họa). */
const standardError = (status: number, code: string, message: string, extra: object = {}, headers?: HttpHeaders): HttpErrorResponse => {
  const error = { timestamp: '2026-10-27T05:00:00Z', status, code, message, path: '/api/v1/users', ...extra };
  return new HttpErrorResponse({ status, statusText: 'x', url: URL, headers, error });
};

describe('toApiError - đọc body lỗi chuẩn (US-40/AC-1..4)', () => {
  it('đọc đủ các trường của lỗi chuẩn kể cả fieldErrors', () => {
    const api = toApiError(standardError(400, 'VALIDATION_ERROR', 'Dữ liệu yêu cầu không hợp lệ', {
      fieldErrors: [{ field: 'username', message: 'Tên đăng nhập phải có ít nhất 3 ký tự', rejectedValue: 'ad' }],
    }));
    expect(api).toEqual({
      timestamp: '2026-10-27T05:00:00Z',
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Dữ liệu yêu cầu không hợp lệ',
      path: '/api/v1/users',
      fieldErrors: [{ field: 'username', message: 'Tên đăng nhập phải có ít nhất 3 ký tự', rejectedValue: 'ad' }],
    });
  });

  it('không phải HttpErrorResponse: trả null', () => {
    expect(toApiError(new Error('boom'))).toBeNull();
    expect(toApiError(undefined)).toBeNull();
    expect(toApiError('lỗi')).toBeNull();
  });

  it.each([
    ['không có body (mất mạng)', null],
    ['body là chuỗi HTML của cổng', '<html><body>502 Bad Gateway</body></html>'],
    ['body là mảng', [{ status: 500, message: 'x' }]],
    ['thiếu message', { status: 500 }],
    ['status sai kiểu', { status: '500', message: 'x' }],
    ['body là Blob (tải tệp lỗi)', new Blob(['x'])],
  ])('body lỗi không đúng chuẩn - %s: trả null thay vì ném lỗi', (_name, body) => {
    expect(toApiError(new HttpErrorResponse({ status: 500, error: body }))).toBeNull();
  });

  it('trường phụ thiếu hoặc sai kiểu được chuẩn hóa, fieldErrors lỗi bị loại', () => {
    const api = toApiError(new HttpErrorResponse({
      status: 400,
      error: {
        status: 400,
        message: 'x',
        code: 123,
        fieldErrors: [{ field: 'a', message: 'ok' }, { field: 5, message: 'sai kiểu' }, 'chuỗi', null, { field: 'b' }],
      },
    }));
    expect(api?.code).toBe('');
    expect(api?.path).toBe('');
    expect(api?.fieldErrors).toEqual([{ field: 'a', message: 'ok', rejectedValue: undefined }]);
  });

  it('fieldErrors không phải mảng: trả mảng rỗng', () => {
    const api = toApiError(new HttpErrorResponse({ status: 400, error: { status: 400, message: 'x', fieldErrors: 'abc' } }));
    expect(api?.fieldErrors).toEqual([]);
  });
});

describe('httpStatusOf', () => {
  it('lấy mã HTTP, 0 khi không phải lỗi HTTP', () => {
    expect(httpStatusOf(standardError(409, 'CONFLICT', 'x'))).toBe(409);
    expect(httpStatusOf(new Error('x'))).toBe(0);
  });
});

describe('isSafeMessage - không lộ chi tiết nội bộ (US-40/AC-4)', () => {
  it.each([
    'Tên đăng nhập đã tồn tại',
    'Không thể khóa quản trị viên cuối cùng',
    'Giá trị phải < 5 và > 1',
  ])('chấp nhận thông điệp thân thiện: %s', message => {
    expect(isSafeMessage(message)).toBe(true);
  });

  it.each([
    ['rỗng', ''],
    ['chỉ khoảng trắng', '   '],
    ['không phải chuỗi', 42],
    ['stack trace Java', 'java.lang.NullPointerException\n\tat com.example.Foo.bar(Foo.java:42)'],
    ['tên lớp Spring', 'org.springframework.dao.DuplicateKeyException: E11000'],
    ['nhắc tới Exception', 'MongoSocketException occurred'],
    ['có thẻ HTML', '<html><body>Bad gateway</body></html>'],
    ['quá dài', 'a'.repeat(501)],
  ])('từ chối - %s', (_name, message) => {
    expect(isSafeMessage(message)).toBe(false);
  });
});

describe('correlationIdOf - hiển thị X-Correlation-Id (US-40/AC-4)', () => {
  it('đọc header của phản hồi', () => {
    const err = standardError(500, 'INTERNAL_ERROR', 'x', {}, new HttpHeaders({ 'X-Correlation-Id': '3f2b8c1e-aaaa-bbbb-cccc-1234567890ab' }));
    expect(correlationIdOf(err)).toBe('3f2b8c1e-aaaa-bbbb-cccc-1234567890ab');
  });

  it.each([
    ['không có header', undefined],
    ['rỗng', new HttpHeaders({ 'X-Correlation-Id': '  ' })],
    ['có ký tự lạ (thử chèn mã)', new HttpHeaders({ 'X-Correlation-Id': '<script>alert(1)</script>' })],
    ['quá dài', new HttpHeaders({ 'X-Correlation-Id': 'a'.repeat(65) })],
  ])('bỏ qua giá trị không hợp lệ - %s', (_name, headers) => {
    expect(correlationIdOf(standardError(500, 'INTERNAL_ERROR', 'x', {}, headers))).toBeNull();
  });

  it('không phải lỗi HTTP: null', () => {
    expect(correlationIdOf(new Error('x'))).toBeNull();
  });
});

describe('toUserError - bảng ánh xạ API-CONTRACT.md §3', () => {
  it('US-40/AC-1: 400 giữ fieldErrors và thông điệp của backend', () => {
    const result = toUserError(standardError(400, 'VALIDATION_ERROR', 'Dữ liệu yêu cầu không hợp lệ', {
      fieldErrors: [{ field: 'email', message: 'Email không đúng định dạng' }],
    }));
    expect(result.kind).toBe('VALIDATION');
    expect(result.message).toBe('Dữ liệu yêu cầu không hợp lệ');
    expect(result.fieldErrors).toEqual([{ field: 'email', message: 'Email không đúng định dạng', rejectedValue: undefined }]);
    expect(result.retryable).toBe(false);
  });

  it('US-40/AC-1: 400 không có fieldErrors vẫn dùng message để làm toast cảnh báo', () => {
    const result = toUserError(standardError(400, 'VALIDATION_ERROR', 'Tham số size phải từ 1 đến 100'));
    expect(result.fieldErrors).toEqual([]);
    expect(result.message).toBe('Tham số size phải từ 1 đến 100');
  });

  it('401: thông báo hết phiên cố định, vẫn giữ message của backend cho form đăng nhập', () => {
    const result = toUserError(standardError(401, 'UNAUTHORIZED', 'Tên đăng nhập hoặc mật khẩu không chính xác'));
    expect(result.kind).toBe('UNAUTHORIZED');
    expect(result.message).toBe(ERROR_MESSAGE.UNAUTHORIZED.message);
    expect(result.serverMessage).toBe('Tên đăng nhập hoặc mật khẩu không chính xác');
  });

  it('403: thông báo không đủ quyền, không thử lại', () => {
    const result = toUserError(standardError(403, 'FORBIDDEN', 'Access Denied'));
    expect(result.kind).toBe('FORBIDDEN');
    expect(result.message).toBe('Bạn không có quyền truy cập chức năng này.');
    expect(result.retryable).toBe(false);
  });

  it('404: thông báo cố định, bỏ qua message của backend', () => {
    const result = toUserError(standardError(404, 'NOT_FOUND', 'Người dùng 671dcba5f123456789abcdef không tồn tại'));
    expect(result.kind).toBe('NOT_FOUND');
    expect(result.message).toBe('Không tìm thấy dữ liệu yêu cầu.');
  });

  it('US-40/AC-3: 409 gợi ý tải lại, không ghi đè im lặng', () => {
    const result = toUserError(standardError(409, 'CONFLICT', 'Tên đăng nhập đã tồn tại'));
    expect(result.kind).toBe('CONFLICT');
    expect(result.message).toBe('Tên đăng nhập đã tồn tại');
    expect(result.hint).toBe(CONFLICT_RELOAD_HINT);
    expect(result.suggestReload).toBe(true);
    expect(result.retryable).toBe(false);
  });

  it('US-40/AC-2: 422 nêu quy tắc nghiệp vụ từ message', () => {
    const result = toUserError(standardError(422, 'BUSINESS_RULE_VIOLATION', 'Không thể khóa quản trị viên cuối cùng'));
    expect(result.kind).toBe('BUSINESS_RULE');
    expect(result.message).toBe('Không thể khóa quản trị viên cuối cùng');
    expect(result.code).toBe('BUSINESS_RULE_VIOLATION');
  });

  it('US-40/AC-4: 500 không lộ stack trace dù body có chứa, và cho phép thử lại', () => {
    const leak = 'java.lang.IllegalStateException: boom\n\tat com.example.UserService.create(UserService.java:88)';
    const result = toUserError(standardError(500, 'INTERNAL_ERROR', leak, { trace: leak }, new HttpHeaders({ 'X-Correlation-Id': 'abc-123' })));
    expect(result.kind).toBe('SERVER');
    expect(result.message).toBe(ERROR_MESSAGE.SERVER.message);
    expect(JSON.stringify(result)).not.toContain('UserService');
    expect(JSON.stringify(result)).not.toContain('java.lang');
    expect(result.correlationId).toBe('abc-123');
    expect(result.retryable).toBe(true);
  });

  it('US-40/AC-4: 4xx mang message có dấu hiệu stack trace thì dùng thông báo mặc định', () => {
    const result = toUserError(standardError(422, 'BUSINESS_RULE_VIOLATION', 'org.springframework.web.server.ResponseStatusException: 422'));
    expect(result.message).toBe(ERROR_MESSAGE.BUSINESS_RULE.message);
    expect(result.serverMessage).toBeNull();
  });

  it('fieldErrors có thông điệp không an toàn bị loại', () => {
    const result = toUserError(standardError(400, 'VALIDATION_ERROR', 'x', {
      fieldErrors: [
        { field: 'a', message: 'Hợp lệ' },
        { field: 'b', message: 'at com.example.Foo.bar(Foo.java:1)' },
      ],
    }));
    expect(result.fieldErrors.map(item => item.field)).toEqual(['a']);
  });

  it.each([502, 503, 504])('%i: lỗi máy chủ tạm thời, cho phép thử lại', status => {
    const result = toUserError(new HttpErrorResponse({ status, url: URL, error: '<html>Bad gateway</html>' }));
    expect(result.kind).toBe('SERVER');
    expect(result.retryable).toBe(true);
    expect(result.message).toBe(ERROR_MESSAGE.SERVER.message);
  });

  it('mất mạng (status 0, không body): thông báo kết nối và cho thử lại', () => {
    const result = toUserError(new HttpErrorResponse({ status: 0, url: URL, error: new ProgressEvent('error') }));
    expect(result.kind).toBe('NETWORK');
    expect(result.message).toBe('Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.');
    expect(result.retryable).toBe(true);
    expect(result.correlationId).toBeNull();
  });

  it('hết thời gian khi đọc (GET): không kèm cảnh báo "đã thực hiện"', () => {
    const err = new HttpErrorResponse({ status: 0, url: URL, error: new RequestTimeoutError('GET', 30000) });
    const result = toUserError(err);
    expect(result.kind).toBe('TIMEOUT');
    expect(result.hint).toBeNull();
    expect(result.retryable).toBe(true);
  });

  it('hết thời gian khi ghi (POST): cảnh báo thao tác có thể đã được thực hiện', () => {
    const err = new HttpErrorResponse({ status: 0, url: URL, error: new RequestTimeoutError('POST', 30000) });
    expect(toUserError(err).hint).toBe(MUTATION_UNCERTAIN_HINT);
  });

  it('408 từ máy chủ cũng là hết thời gian', () => {
    expect(toUserError(new HttpErrorResponse({ status: 408, url: URL })).kind).toBe('TIMEOUT');
  });

  it('4xx khác (ví dụ 413/429) không có trong hợp đồng: nhóm CLIENT, không thử lại', () => {
    const result = toUserError(new HttpErrorResponse({ status: 429, url: URL, error: null }));
    expect(result.kind).toBe('CLIENT');
    expect(result.retryable).toBe(false);
    expect(result.message).toBe(ERROR_MESSAGE.CLIENT.message);
  });

  it('phản hồi 200 nhưng JSON hỏng (HttpErrorResponse status 200): UNKNOWN', () => {
    const result = toUserError(new HttpErrorResponse({ status: 200, url: URL, error: 'Unexpected token <' }));
    expect(result.kind).toBe('UNKNOWN');
    expect(result.message).toBe(ERROR_MESSAGE.UNKNOWN.message);
  });

  it('lỗi JavaScript thường: UNKNOWN và KHÔNG đưa error.message vào kết quả', () => {
    const result = toUserError(new TypeError('Cannot read properties of undefined (reading secret)'));
    expect(result.kind).toBe('UNKNOWN');
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});
