import { AbstractControl } from '@angular/forms';
import { IApiFieldError } from '@models/common/response-data.model';
import { UserErrorKind } from '@models/common/user-error.model';
import { toUserError } from './api-error.util';

/** Khóa lỗi gắn vào control: `control.errors?.['server']` là thông điệp do backend trả. */
export const SERVER_ERROR_KEY = 'server';

export interface IApplyFieldErrorsOptions {
  /** Tên trường của backend → đường dẫn control, khi hai bên đặt tên khác nhau. */
  aliases?: Readonly<Record<string, string>>;
}

export interface IFormErrorOutcome {
  /** Lỗi không gắn được vào ô nhập nào (trường không có trên form, ô đang bị vô hiệu hóa). */
  unmatched: IApiFieldError[];
  /** Thông báo tổng cho thanh lỗi của form; null khi toàn bộ lỗi đã nằm ở từng ô hoặc đã có toast. */
  summary: string | null;
}

/** `roleAssignments[0].programIds` → `roleAssignments.0.programIds` để FormGroup.get() tìm được. */
const toControlPath = (field: string): string => field.replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '');

/**
 * Gắn lỗi theo trường (400 `fieldErrors`) vào Reactive Form: đặt lỗi `server` lên control, đánh dấu đã chạm
 * để ô hiện viền đỏ và dòng lỗi. Lỗi tự biến mất khi người dùng sửa giá trị (Angular chạy lại validator).
 * Nhiều lỗi cùng một trường được nối lại. Không đụng tới giá trị đã nhập.
 */
export function applyFieldErrors(
  form: AbstractControl,
  fieldErrors: readonly IApiFieldError[] | null | undefined,
  options: IApplyFieldErrorsOptions = {},
): IApiFieldError[] {
  const unmatched: IApiFieldError[] = [];
  const grouped = new Map<AbstractControl, string[]>();

  for (const item of fieldErrors ?? []) {
    const path = toControlPath(options.aliases?.[item.field] ?? item.field);
    const control = path ? form.get(path) : null;
    if (!control || control.disabled) {
      unmatched.push(item);
      continue;
    }
    grouped.set(control, [...(grouped.get(control) ?? []), item.message]);
  }

  for (const [control, messages] of grouped) {
    control.setErrors({ ...control.errors, [SERVER_ERROR_KEY]: messages.join(' ') });
    control.markAsTouched();
  }
  return unmatched;
}

/** Thông điệp lỗi máy chủ của một ô, hoặc null. Dùng cho `app-field-error-display`. */
export function serverErrorOf(control: AbstractControl | null | undefined): string | null {
  const value: unknown = control?.errors?.[SERVER_ERROR_KEY];
  return typeof value === 'string' && value ? value : null;
}

/** Lỗi đã có toast toàn cục hoặc chuyển trang: form không cần nhắc lại. */
const GLOBALLY_REPORTED: readonly UserErrorKind[] = ['SERVER', 'NETWORK', 'TIMEOUT', 'FORBIDDEN', 'UNKNOWN'];

/**
 * Điểm vào cho `catchError` của form: ánh xạ lỗi gửi đi vào form.
 * - Có `fieldErrors`: gắn vào từng ô; phần không gắn được gom vào `summary`.
 * - Không có `fieldErrors` (409, 422, 404, 401 của đăng nhập...): `summary` là thông điệp của backend
 *   (hoặc thông điệp mặc định), kèm gợi ý tải lại khi 409; giữ nguyên dữ liệu người dùng đã nhập.
 * - 5xx, mất mạng, hết thời gian, 403: `summary` null vì HandlerErrorService đã báo.
 */
export function applyApiErrorToForm(
  form: AbstractControl,
  err: unknown,
  options: IApplyFieldErrorsOptions = {},
): IFormErrorOutcome {
  const userError = toUserError(err);
  if (GLOBALLY_REPORTED.includes(userError.kind)) {
    return { unmatched: [], summary: null };
  }
  if (userError.fieldErrors.length) {
    const unmatched = applyFieldErrors(form, userError.fieldErrors, options);
    return { unmatched, summary: unmatched.length ? unmatched.map(item => item.message).join(' ') : null };
  }
  const base = userError.serverMessage ?? userError.message;
  return { unmatched: [], summary: userError.hint ? `${base} ${userError.hint}` : base };
}
