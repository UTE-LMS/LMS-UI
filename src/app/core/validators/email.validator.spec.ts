import { FormControl } from '@angular/forms';
import { emailValidator } from './email.validator';

describe('NT-UI/AC-1: emailValidator', () => {
  it('bỏ qua giá trị rỗng/null để Validators.required xử lý (ca biên)', () => {
    expect(emailValidator(new FormControl(''))).toBeNull();
    expect(emailValidator(new FormControl(null))).toBeNull();
  });

  it('chấp nhận email hợp lệ', () => {
    expect(emailValidator(new FormControl('sv.test-01@hcmute.edu.vn'))).toBeNull();
  });

  it.each(['thieu-a-cong', 'a@', '@hcmute.edu.vn', 'a@b', 'a b@hcmute.edu.vn'])(
    'từ chối "%s" bằng lỗi invalidEmail (ca âm)',
    (value) => {
      const result = emailValidator(new FormControl(value));
      expect(result).toEqual({ invalidEmail: { valid: false, value } });
    },
  );
});
