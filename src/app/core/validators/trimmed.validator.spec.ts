import { FormControl } from '@angular/forms';
import { notBlankValidator, trimmedEmailValidator, trimmedMinLength } from './trimmed.validator';

const control = (value: unknown) => new FormControl(value);

describe('trimmed validators (backend trim giá trị)', () => {
  it('notBlank: chuỗi toàn dấu cách là trống, chuỗi rỗng để required xử lý', () => {
    expect(notBlankValidator(control('   '))).toEqual({ required: true });
    expect(notBlankValidator(control(''))).toBeNull();
    expect(notBlankValidator(control(' a '))).toBeNull();
  });

  it('trimmedMinLength: tính trên giá trị đã trim', () => {
    const min3 = trimmedMinLength(3);
    expect(min3(control('  ab  '))).toEqual({ minlength: { requiredLength: 3, actualLength: 2 } });
    expect(min3(control(' abc '))).toBeNull();
    expect(min3(control(''))).toBeNull();
  });

  it('trimmedEmail: chấp nhận email có khoảng trắng thừa, vẫn từ chối email sai', () => {
    expect(trimmedEmailValidator(control('  a@example.test '))).toBeNull();
    expect(trimmedEmailValidator(control('khong-phai-email'))).not.toBeNull();
    expect(trimmedEmailValidator(control(''))).toBeNull();
  });
});
