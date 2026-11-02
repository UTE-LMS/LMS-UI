import { HttpErrorResponse } from '@angular/common/http';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { CONFLICT_RELOAD_HINT } from '@constants/error-message.constant';
import { applyApiErrorToForm, applyFieldErrors, SERVER_ERROR_KEY, serverErrorOf } from './form-server-errors.util';

const makeForm = () => new FormGroup({
  username: new FormControl('ad', { nonNullable: true, validators: [Validators.required] }),
  email: new FormControl('a@example.test', { nonNullable: true }),
  roleAssignments: new FormArray([
    new FormGroup({ programIds: new FormControl<string[]>([], { nonNullable: true }) }),
  ]),
});

const apiError = (status: number, message: string, extra: object = {}): HttpErrorResponse => new HttpErrorResponse({
  status,
  url: 'http://localhost:8080/api/v1/users',
  error: { timestamp: '2026-10-27T05:00:00Z', status, code: 'X', message, path: '/api/v1/users', ...extra },
});

describe('applyFieldErrors - gắn fieldErrors vào Reactive Form (US-40/AC-1)', () => {
  it('đặt lỗi server lên đúng ô, đánh dấu đã chạm và làm form không hợp lệ', () => {
    const form = makeForm();
    const unmatched = applyFieldErrors(form, [{ field: 'username', message: 'Tên đăng nhập phải có ít nhất 3 ký tự' }]);
    expect(unmatched).toEqual([]);
    expect(serverErrorOf(form.controls.username)).toBe('Tên đăng nhập phải có ít nhất 3 ký tự');
    expect(form.controls.username.touched).toBe(true);
    expect(form.controls.username.invalid).toBe(true);
    expect(form.invalid).toBe(true);
    expect(serverErrorOf(form.controls.email)).toBeNull();
  });

  it('giữ nguyên giá trị người dùng đã nhập và các lỗi validator có sẵn', () => {
    const form = makeForm();
    form.controls.username.setValue('');
    applyFieldErrors(form, [{ field: 'username', message: 'Lỗi từ máy chủ' }]);
    expect(form.controls.username.value).toBe('');
    expect(form.controls.username.hasError('required')).toBe(true);
    expect(form.controls.username.errors?.[SERVER_ERROR_KEY]).toBe('Lỗi từ máy chủ');
    expect(form.controls.email.value).toBe('a@example.test');
  });

  it('lỗi tự biến mất khi người dùng sửa lại giá trị', () => {
    const form = makeForm();
    applyFieldErrors(form, [{ field: 'username', message: 'Lỗi từ máy chủ' }]);
    form.controls.username.setValue('admin01');
    expect(serverErrorOf(form.controls.username)).toBeNull();
    expect(form.controls.username.valid).toBe(true);
  });

  it('nhiều lỗi cùng một trường được nối lại', () => {
    const form = makeForm();
    applyFieldErrors(form, [
      { field: 'email', message: 'Email không đúng định dạng.' },
      { field: 'email', message: 'Email đã tồn tại.' },
    ]);
    expect(serverErrorOf(form.controls.email)).toBe('Email không đúng định dạng. Email đã tồn tại.');
  });

  it('hỗ trợ đường dẫn lồng nhau kiểu roleAssignments[0].programIds', () => {
    const form = makeForm();
    const unmatched = applyFieldErrors(form, [{ field: 'roleAssignments[0].programIds', message: 'Mã CTĐT không tồn tại' }]);
    expect(unmatched).toEqual([]);
    expect(serverErrorOf(form.get('roleAssignments.0.programIds'))).toBe('Mã CTĐT không tồn tại');
  });

  it('trường không có trên form được trả về trong unmatched thay vì bị nuốt', () => {
    const form = makeForm();
    const item = { field: 'noSuchField', message: 'Lỗi lạ' };
    expect(applyFieldErrors(form, [item])).toEqual([item]);
    expect(form.valid).toBe(true);
  });

  it('ô đang bị vô hiệu hóa không nhận lỗi, lỗi đi vào unmatched', () => {
    const form = makeForm();
    form.controls.username.disable();
    const item = { field: 'username', message: 'Lỗi' };
    expect(applyFieldErrors(form, [item])).toEqual([item]);
  });

  it('hỗ trợ ánh xạ tên trường của backend sang tên control', () => {
    const form = makeForm();
    applyFieldErrors(form, [{ field: 'userName', message: 'Sai' }], { aliases: { userName: 'username' } });
    expect(serverErrorOf(form.controls.username)).toBe('Sai');
  });

  it('danh sách null/undefined/rỗng: không làm gì', () => {
    const form = makeForm();
    expect(applyFieldErrors(form, null)).toEqual([]);
    expect(applyFieldErrors(form, undefined)).toEqual([]);
    expect(applyFieldErrors(form, [])).toEqual([]);
    expect(form.valid).toBe(true);
  });

  it('tên trường rỗng không làm hỏng, đi vào unmatched', () => {
    const form = makeForm();
    const item = { field: '', message: 'Lỗi' };
    expect(applyFieldErrors(form, [item])).toEqual([item]);
  });
});

describe('serverErrorOf', () => {
  it('trả null khi không có control hoặc lỗi không phải chuỗi', () => {
    expect(serverErrorOf(null)).toBeNull();
    expect(serverErrorOf(undefined)).toBeNull();
    const control = new FormControl('x');
    control.setErrors({ server: 123 });
    expect(serverErrorOf(control)).toBeNull();
  });
});

describe('applyApiErrorToForm - điểm vào cho catchError của form', () => {
  it('US-40/AC-1: 400 có fieldErrors gắn vào ô, không cần thông báo tổng', () => {
    const form = makeForm();
    const outcome = applyApiErrorToForm(form, apiError(400, 'Dữ liệu yêu cầu không hợp lệ', {
      fieldErrors: [{ field: 'email', message: 'Email không đúng định dạng' }],
    }));
    expect(outcome).toEqual({ unmatched: [], summary: null });
    expect(serverErrorOf(form.controls.email)).toBe('Email không đúng định dạng');
  });

  it('US-40/AC-1: lỗi theo trường không gắn được thì đưa vào thông báo tổng', () => {
    const form = makeForm();
    const outcome = applyApiErrorToForm(form, apiError(400, 'x', {
      fieldErrors: [{ field: 'email', message: 'Sai email' }, { field: 'khongCo', message: 'Lỗi khác' }],
    }));
    expect(outcome.unmatched).toEqual([{ field: 'khongCo', message: 'Lỗi khác', rejectedValue: undefined }]);
    expect(outcome.summary).toBe('Lỗi khác');
  });

  it('US-40/AC-3: 409 không có fieldErrors cho thông báo tổng kèm gợi ý tải lại', () => {
    const outcome = applyApiErrorToForm(makeForm(), apiError(409, 'Tên đăng nhập đã tồn tại'));
    expect(outcome.summary).toBe(`Tên đăng nhập đã tồn tại ${CONFLICT_RELOAD_HINT}`);
  });

  it('US-40/AC-2: 422 giữ nguyên dữ liệu và nêu quy tắc nghiệp vụ', () => {
    const form = makeForm();
    form.controls.email.setValue('giu-nguyen@example.test');
    const outcome = applyApiErrorToForm(form, apiError(422, 'Không thể khóa quản trị viên cuối cùng'));
    expect(outcome.summary).toBe('Không thể khóa quản trị viên cuối cùng');
    expect(form.controls.email.value).toBe('giu-nguyen@example.test');
  });

  it('401 của đăng nhập: dùng message của backend', () => {
    const outcome = applyApiErrorToForm(makeForm(), apiError(401, 'Tên đăng nhập hoặc mật khẩu không chính xác'));
    expect(outcome.summary).toBe('Tên đăng nhập hoặc mật khẩu không chính xác');
  });

  it.each([
    ['500', new HttpErrorResponse({ status: 500, error: 'x' })],
    ['mất mạng', new HttpErrorResponse({ status: 0 })],
    ['403', apiError(403, 'Forbidden')],
    ['lỗi JavaScript', new Error('x')],
  ])('%s: đã có toast toàn cục nên form không hiển thị thêm', (_name, err) => {
    expect(applyApiErrorToForm(makeForm(), err)).toEqual({ unmatched: [], summary: null });
  });
});
