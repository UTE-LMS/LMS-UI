import { FormControl } from '@angular/forms';
import { phoneNumberValidator } from './phone.validator';

describe('NT-UI/AC-1: phoneNumberValidator', () => {
  it('bỏ qua giá trị rỗng/null (ca biên)', () => {
    expect(phoneNumberValidator(new FormControl(''))).toBeNull();
    expect(phoneNumberValidator(new FormControl(null))).toBeNull();
  });

  it('chấp nhận đúng 10 chữ số', () => {
    expect(phoneNumberValidator(new FormControl('0123456789'))).toBeNull();
  });

  it.each(['012345678', '01234567890', '01234abcde', '0123 56789'])(
    'từ chối "%s" (9 hoặc 11 chữ số, có chữ, có khoảng trắng)',
    (value) => {
      expect(phoneNumberValidator(new FormControl(value)))
        .toEqual({ invalidPhoneNumber: { valid: false, value } });
    },
  );
});
