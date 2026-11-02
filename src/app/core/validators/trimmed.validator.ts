import { AbstractControl, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { emailValidator } from './email.validator';

/**
 * Backend trim giá trị trước khi kiểm tra (API-CONTRACT.md §5.3.2), nên form kiểm tra theo giá trị đã trim
 * để dán email có khoảng trắng thừa không bị báo sai, và chuỗi toàn dấu cách bị coi là trống.
 */

/** Dùng cùng Validators.required: chuỗi chỉ gồm khoảng trắng bị coi là trống (khóa lỗi `required`). */
export const notBlankValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => (typeof control.value === 'string' && control.value !== '' && control.value.trim() === ''
  ? { required: true }
  : null);

/** Độ dài tối thiểu tính trên giá trị đã trim (khóa lỗi `minlength`). Ô trống để required xử lý. */
export const trimmedMinLength = (min: number): ValidatorFn => (control: AbstractControl): ValidationErrors | null => {
  if (typeof control.value !== 'string') {
    return null;
  }
  const trimmed = control.value.trim();
  return trimmed !== '' && trimmed.length < min
    ? { minlength: { requiredLength: min, actualLength: trimmed.length } }
    : null;
};

/** Kiểm tra email trên giá trị đã trim (khóa lỗi `invalidEmail`). */
export const trimmedEmailValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => (typeof control.value === 'string' ? emailValidator(new FormControl(control.value.trim())) : null);
