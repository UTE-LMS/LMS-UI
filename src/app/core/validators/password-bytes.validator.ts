import { AbstractControl, ValidationErrors } from '@angular/forms';

export const PASSWORD_MIN_BYTES = 8;
export const PASSWORD_MAX_BYTES = 72;

/**
 * Mật khẩu dài 8 đến 72 byte UTF-8 (API-CONTRACT.md §5.3.2). BCrypt giới hạn theo byte chứ không theo ký tự,
 * nên chữ có dấu tiếng Việt (2-3 byte mỗi ký tự) có thể vượt 72 byte dù chưa tới 72 ký tự.
 * Ô trống để Validators.required xử lý.
 */
export const passwordBytesValidator = (control: AbstractControl): ValidationErrors | null => {
  if (typeof control.value !== 'string' || control.value === '') {
    return null;
  }
  const bytes = new TextEncoder().encode(control.value).length;
  if (bytes < PASSWORD_MIN_BYTES) {
    return { passwordTooShort: { bytes } };
  }
  if (bytes > PASSWORD_MAX_BYTES) {
    return { passwordTooLong: { bytes } };
  }
  return null;
};
